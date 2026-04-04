const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { execSync, spawnSync } = require("child_process");

const HF_TOKEN = process.env.HF_TOKEN;
const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
const SVD_MODEL = "stabilityai/stable-video-diffusion-img2vid-xt-1-1";

function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a, b, t) {
        return a + (b - a) * t;
}

async function fetchProfilePic(userID, savePath) {
        const url = `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=${FB_TOKEN}`;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, maxRedirects: 10 });
        fs.writeFileSync(savePath, Buffer.from(res.data));
}

async function animateWithSVD(imagePath) {
        const imageBuffer = fs.readFileSync(imagePath);
        const res = await axios.post(
                `https://api-inference.huggingface.co/models/${SVD_MODEL}`,
                imageBuffer,
                {
                        headers: {
                                Authorization: `Bearer ${HF_TOKEN}`,
                                "Content-Type": "image/jpeg",
                                "x-wait-for-model": "true"
                        },
                        responseType: "arraybuffer",
                        timeout: 240000
                }
        );
        return Buffer.from(res.data);
}

function buildAIVideo(vid1Path, vid2Path, outputPath, senderName, targetName) {
        const heartText = `${senderName} 💋 ${targetName}`;
        const safe = heartText.replace(/'/g, "\\'").replace(/:/g, "\\:");

        execSync(
                `ffmpeg -y -i "${vid1Path}" -i "${vid2Path}" -filter_complex "
[0:v]scale=390:440,hflip,setpts=PTS-STARTPTS[left];
[1:v]scale=390:440,setpts=PTS-STARTPTS[right];
[left][right]hstack=inputs=2[stacked];
[stacked]zoompan=z='if(lte(on,1),1,min(1.45,zoom+0.008))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=780x440:fps=14[zoomed];
[zoomed]drawtext=text='${safe}':fontsize=22:fontcolor=white:x=(w-text_w)/2:y=h-40:shadowcolor=black:shadowx=1:shadowy=1[out]
" -map "[out]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outputPath}"`,
                { timeout: 120000 }
        );
}

function drawSplitFrame(ctx, img1, img2, W, H, progress) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, W, H);

        const phase1End = 0.30;
        const phase2End = 0.70;
        const phase3End = 1.00;

        let p1x, p2x, zoom1, zoom2, splitX, splitBlend;
        const half = W / 2;

        if (progress <= phase1End) {
                const p = easeInOut(progress / phase1End);
                p1x = half * 0.50 - p * half * 0.05;
                p2x = half * 0.50 + p * half * 0.05;
                zoom1 = 1.0 + p * 0.05;
                zoom2 = 1.0 + p * 0.05;
                splitX = half;
                splitBlend = 0;
        } else if (progress <= phase2End) {
                const p = easeInOut((progress - phase1End) / (phase2End - phase1End));
                p1x = half * 0.45 + p * half * 0.40;
                p2x = half * 0.55 - p * half * 0.40;
                zoom1 = 1.05 + p * 0.30;
                zoom2 = 1.05 + p * 0.30;
                splitX = half - p * half * 0.35;
                splitBlend = p * 0.5;
        } else {
                const p = easeInOut((progress - phase2End) / (phase3End - phase2End));
                p1x = half * 0.85 + p * half * 0.05;
                p2x = half * 0.15 - p * half * 0.05;
                zoom1 = 1.35 + p * 0.10;
                zoom2 = 1.35 + p * 0.10;
                splitX = half - 0.35 * half - p * half * 0.20;
                splitBlend = 0.5 + p * 0.5;
        }

        const faceH = H * 1.08;
        const faceW1 = faceH * (img1.width / img1.height) * zoom1;
        const faceW2 = faceH * (img2.width / img2.height) * zoom2;
        const leftX = p1x - faceW1 * 0.5;
        const rightX = W - p2x - faceW2 * 0.5;
        const imgY = (H - faceH) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, H);
        ctx.clip();
        ctx.drawImage(img1, leftX, imgY, faceW1, faceH);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, W - splitX, H);
        ctx.clip();
        ctx.drawImage(img2, rightX, imgY, faceW2, faceH);
        ctx.restore();

        if (splitBlend > 0) {
                const overlapW = Math.max(0, (p1x + faceW1 * 0.4) - (W - p2x - faceW2 * 0.4));
                if (overlapW > 0) {
                        const overlapStart = W - p2x - faceW2 * 0.4;
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(overlapStart, 0, overlapW, H);
                        ctx.clip();
                        ctx.globalAlpha = splitBlend * 0.6;
                        ctx.drawImage(img1, leftX, imgY, faceW1, faceH);
                        ctx.restore();
                }
        }

        const lineAlpha = Math.max(0, 1.0 - splitBlend * 2.5);
        if (lineAlpha > 0.02) {
                const lineGrad = ctx.createLinearGradient(splitX - 2, 0, splitX + 2, 0);
                lineGrad.addColorStop(0.5, `rgba(220,220,255,${lineAlpha * 0.6})`);
                ctx.fillStyle = lineGrad;
                ctx.fillRect(splitX - 2, 0, 4, H);
        }

        if (progress > 0.55) {
                const heartAmt = (progress - 0.55) / 0.45;
                const centerX = lerp(half, splitX + 10, heartAmt);
                const numHearts = Math.floor(heartAmt * 7);
                for (let i = 0; i < numHearts; i++) {
                        const hx = centerX + (Math.sin(i * 2.1) * 90) + Math.sin(progress * 8 + i) * 15;
                        const hy = H * 0.10 + (i * 30) + Math.sin(progress * 5 + i) * 12;
                        const hSize = 12 + i * 3;
                        ctx.save();
                        ctx.globalAlpha = Math.min(1, heartAmt) * (0.5 + 0.5 * Math.sin(progress * 10 + i));
                        ctx.fillStyle = "#ff4d94";
                        ctx.font = `${hSize}px serif`;
                        ctx.fillText("♥", hx, hy % (H * 0.85));
                        ctx.restore();
                }
        }

        if (progress > 0.50) {
                const vigAmt = (progress - 0.50) / 0.50;
                const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75);
                vigGrad.addColorStop(0, "rgba(0,0,0,0)");
                vigGrad.addColorStop(1, `rgba(0,0,0,${vigAmt * 0.50})`);
                ctx.fillStyle = vigGrad;
                ctx.fillRect(0, 0, W, H);
        }

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💋", W / 2, H - 16);
        ctx.restore();
}

function buildCanvasFallbackVideo(img1, img2, tmpDir, outputPath) {
        const W = 780, H = 440, FPS = 24;
        const TOTAL_FRAMES = Math.floor(FPS * 5.5);
        for (let f = 0; f < TOTAL_FRAMES; f++) {
                const progress = f / (TOTAL_FRAMES - 1);
                const canvas = createCanvas(W, H);
                const ctx = canvas.getContext("2d");
                drawSplitFrame(ctx, img1, img2, W, H, progress);
                const framePath = path.join(tmpDir, `frame_${String(f).padStart(4, "0")}.png`);
                fs.writeFileSync(framePath, canvas.toBuffer("image/png"));
        }
        execSync(
                `ffmpeg -y -framerate ${FPS} -i "${path.join(tmpDir, "frame_%04d.png")}" ` +
                `-vf "scale=${W}:${H}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outputPath}"`,
                { timeout: 90000 }
        );
}

module.exports = {
        config: {
                name: "قبلة",
                aliases: ["kiss"],
                version: "5.0",
                author: "BlackBot",
                countDown: 20,
                role: 0,
                shortDescription: "فيديو قبلة بصور البروفايل (ذكاء اصطناعي)",
                longDescription: "ينشئ فيديو MP4 بالذكاء الاصطناعي يُحرّك صور البروفايل في مشهد قبلة",
                category: "fun",
                guide: "{pn} @ذكر أو رد على رسالة"
        },

        onStart: async function ({ message, event, api }) {
                const tmpDir = path.join(__dirname, `kiss_tmp_${Date.now()}`);
                fs.mkdirSync(tmpDir, { recursive: true });

                try {
                        const mention = Object.keys(event.mentions || {});
                        let targetID;

                        if (event.messageReply) {
                                targetID = event.messageReply.senderID;
                        } else if (mention.length > 0) {
                                targetID = mention[0];
                        } else {
                                fs.rmSync(tmpDir, { recursive: true, force: true });
                                return message.reply("💋 | اذكر شخصاً أو رد على رسالته\nمثال: .قبلة @اسم");
                        }

                        const senderID = event.senderID;
                        const senderName = event.senderName || "شخص";
                        const targetName = (event.mentions || {})[targetID] || "آخر";

                        const img1Path = path.join(tmpDir, "img1.jpg");
                        const img2Path = path.join(tmpDir, "img2.jpg");

                        await message.reply("⏳ | جاري إنشاء الفيديو...");

                        await Promise.all([
                                fetchProfilePic(senderID, img1Path),
                                fetchProfilePic(targetID, img2Path)
                        ]);

                        const outputPath = path.join(tmpDir, "kiss_output.mp4");
                        let usedAI = false;

                        if (HF_TOKEN) {
                                try {
                                        const [vid1Buf, vid2Buf] = await Promise.all([
                                                animateWithSVD(img1Path),
                                                animateWithSVD(img2Path)
                                        ]);

                                        const vid1Path = path.join(tmpDir, "anim1.mp4");
                                        const vid2Path = path.join(tmpDir, "anim2.mp4");
                                        fs.writeFileSync(vid1Path, vid1Buf);
                                        fs.writeFileSync(vid2Path, vid2Buf);

                                        buildAIVideo(vid1Path, vid2Path, outputPath, senderName, targetName);
                                        usedAI = true;
                                } catch (hfErr) {
                                        console.error("[قبلة][HF]", hfErr.message || hfErr);
                                }
                        }

                        if (!usedAI) {
                                const img1 = await loadImage(img1Path);
                                const img2 = await loadImage(img2Path);
                                buildCanvasFallbackVideo(img1, img2, tmpDir, outputPath);
                        }

                        const label = usedAI
                                ? `🤖💋 | ${senderName} قبّل ${targetName} 💕`
                                : `💋 | ${senderName} قبّل ${targetName} 💕`;

                        await message.reply({
                                body: label,
                                attachment: fs.createReadStream(outputPath)
                        });

                } catch (err) {
                        console.error("[قبلة]", err.message || err);
                        message.reply("❌ | حدث خطأ أثناء إنشاء الفيديو.");
                } finally {
                        setTimeout(() => {
                                try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
                        }, 60000);
                }
        }
};
