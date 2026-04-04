const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { execSync } = require("child_process");

const HF_TOKEN = process.env.HF_TOKEN;
const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
}

async function fetchProfilePic(userID, savePath) {
        const url = `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=${FB_TOKEN}`;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, maxRedirects: 10 });
        fs.writeFileSync(savePath, Buffer.from(res.data));
}

async function detectFace(imagePath) {
        try {
                const imageBuffer = fs.readFileSync(imagePath);
                const res = await axios.post(
                        "https://api-inference.huggingface.co/models/facebook/detr-resnet-50",
                        imageBuffer,
                        {
                                headers: {
                                        Authorization: `Bearer ${HF_TOKEN}`,
                                        "Content-Type": "image/jpeg",
                                        "x-wait-for-model": "true"
                                },
                                timeout: 45000
                        }
                );
                const items = res.data || [];
                const person = items.find(d => d.label === "person");
                if (person && person.box) {
                        return person.box;
                }
        } catch (e) {
                console.error("[قبلة][FaceDetect]", e.message);
        }
        return null;
}

function cropFaceImage(ctx, img, box, imgW, imgH, destX, destY, destW, destH, mirrorX) {
        const srcX = box ? Math.max(0, box.xmin * img.width / imgW) : 0;
        const srcY = box ? Math.max(0, box.ymin * img.height / imgH * 0.5) : 0;
        const srcW = box ? Math.min(img.width - srcX, (box.xmax - box.xmin) * img.width / imgW) : img.width;
        const srcH = box ? Math.min(img.height - srcY, (box.ymax - box.ymin) * img.height / imgH * 1.3) : img.height;

        ctx.save();
        if (mirrorX) {
                ctx.scale(-1, 1);
                ctx.drawImage(img, srcX, srcY, srcW, srcH, -destX - destW, destY, destW, destH);
        } else {
                ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
        }
        ctx.restore();
}

function drawRomanticFrame(ctx, img1, img2, box1, box2, W, H, progress, senderName, targetName) {
        const phase1 = 0.25;
        const phase2 = 0.60;
        const phase3 = 0.80;
        const phase4 = 1.00;

        let bgAlpha, faceScale, faceOffset, heartCount, flashAlpha, textAlpha;

        if (progress <= phase1) {
                const p = easeInOut(progress / phase1);
                faceScale = 0.70 + p * 0.15;
                faceOffset = 0.42 - p * 0.02;
                heartCount = 0;
                flashAlpha = 0;
                bgAlpha = p;
                textAlpha = 0;
        } else if (progress <= phase2) {
                const p = easeInOut((progress - phase1) / (phase2 - phase1));
                faceScale = 0.85 + p * 0.20;
                faceOffset = 0.40 - p * 0.38;
                heartCount = Math.floor(p * 5);
                flashAlpha = 0;
                bgAlpha = 1;
                textAlpha = 0;
        } else if (progress <= phase3) {
                const p = easeOut((progress - phase2) / (phase3 - phase2));
                faceScale = 1.05 + p * 0.15;
                faceOffset = 0.02 - p * 0.02;
                heartCount = 5 + Math.floor(p * 4);
                flashAlpha = p * 0.65;
                bgAlpha = 1;
                textAlpha = 0;
        } else {
                const p = easeOut((progress - phase3) / (phase4 - phase3));
                faceScale = 1.20 + p * 0.05;
                faceOffset = 0;
                heartCount = 9;
                flashAlpha = 0.65 - p * 0.40;
                bgAlpha = 1;
                textAlpha = p;
        }

        const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
        bgGrad.addColorStop(0, `rgba(60,0,30,${bgAlpha})`);
        bgGrad.addColorStop(0.5, `rgba(100,0,50,${bgAlpha})`);
        bgGrad.addColorStop(1, `rgba(20,0,15,${bgAlpha})`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        const particleCount = 18;
        for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2 + progress * 1.2;
                const r = W * (0.30 + 0.08 * Math.sin(progress * 3 + i));
                const px = W / 2 + Math.cos(angle) * r;
                const py = H / 2 + Math.sin(angle) * r * 0.55;
                const alpha = 0.03 + 0.04 * Math.sin(progress * 5 + i);
                ctx.save();
                ctx.globalAlpha = alpha * bgAlpha;
                ctx.fillStyle = "#ff69b4";
                ctx.beginPath();
                ctx.arc(px, py, 2 + Math.sin(i) * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
        }

        const faceSize = Math.min(W, H) * faceScale * 0.52;
        const centerY = H * 0.48;
        const leftCX = W / 2 - faceOffset * W - (faceSize * 0.5);
        const rightCX = W / 2 + faceOffset * W + (faceSize * 0.5);

        const drawCircleFace = (img, box, cx, cy, size, mirror) => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
                ctx.clip();
                const shadowGrad = ctx.createRadialGradient(cx - size * 0.1, cy - size * 0.1, 0, cx, cy, size / 2);
                shadowGrad.addColorStop(0, "rgba(255,180,180,0.15)");
                shadowGrad.addColorStop(1, "rgba(0,0,0,0.35)");
                cropFaceImage(ctx, img, box, 720, 720, cx - size / 2, cy - size / 2, size, size, mirror);
                ctx.fillStyle = shadowGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.save();
                const borderGrad = ctx.createLinearGradient(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2);
                borderGrad.addColorStop(0, "rgba(255,150,180,0.9)");
                borderGrad.addColorStop(0.5, "rgba(255,80,120,0.7)");
                borderGrad.addColorStop(1, "rgba(200,50,100,0.9)");
                ctx.strokeStyle = borderGrad;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
        };

        drawCircleFace(img1, box1, leftCX + faceSize * 0.5, centerY, faceSize, false);
        drawCircleFace(img2, box2, rightCX - faceSize * 0.5, centerY, faceSize, true);

        if (progress > phase2 - 0.05) {
                const kissProgress = Math.max(0, (progress - (phase2 - 0.05)) / 0.05);
                const glow = ctx.createRadialGradient(W / 2, centerY, 0, W / 2, centerY, faceSize * 0.6);
                glow.addColorStop(0, `rgba(255,120,180,${0.35 * kissProgress})`);
                glow.addColorStop(1, "rgba(255,80,120,0)");
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, W, H);

                ctx.save();
                ctx.globalAlpha = 0.7 * kissProgress;
                ctx.font = `${Math.floor(faceSize * 0.35)}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("💋", W / 2, centerY);
                ctx.restore();
        }

        if (flashAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = flashAlpha;
                const flashGrad = ctx.createRadialGradient(W / 2, centerY, 0, W / 2, centerY, W * 0.6);
                flashGrad.addColorStop(0, "rgba(255,220,240,1)");
                flashGrad.addColorStop(0.3, "rgba(255,150,200,0.5)");
                flashGrad.addColorStop(1, "rgba(255,80,120,0)");
                ctx.fillStyle = flashGrad;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
        }

        const heartEmojis = ["❤️", "💕", "💗", "💓", "💖", "💝", "💞"];
        for (let i = 0; i < heartCount; i++) {
                const seed = i * 137.508;
                const hx = (W * 0.15) + (seed % (W * 0.70));
                const baseY = H * 0.85 - (i / 9) * H * 0.65;
                const hy = baseY - (progress * 0.5) * H * 0.5 + Math.sin(progress * 6 + i) * 18;
                const hSize = 14 + (i % 3) * 6;
                const hAlpha = Math.max(0, 0.85 - ((H * 0.85 - hy) / (H * 0.65)));

                ctx.save();
                ctx.globalAlpha = hAlpha * Math.min(1, heartCount / 9);
                ctx.font = `${hSize}px serif`;
                ctx.textAlign = "center";
                ctx.fillText(heartEmojis[i % heartEmojis.length], hx, hy);
                ctx.restore();
        }

        if (textAlpha > 0) {
                const label = `${senderName} 💋 ${targetName}`;
                ctx.save();
                ctx.globalAlpha = textAlpha;
                ctx.font = "bold 20px Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.shadowColor = "rgba(255,80,120,0.8)";
                ctx.shadowBlur = 12;
                ctx.fillStyle = "#ffffff";
                ctx.fillText(label, W / 2, H - 28);
                ctx.restore();
        }

        const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.72);
        vigGrad.addColorStop(0, "rgba(0,0,0,0)");
        vigGrad.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, W, H);
}

module.exports = {
        config: {
                name: "قبلة",
                aliases: ["kiss"],
                version: "6.0",
                author: "BlackBot",
                countDown: 20,
                role: 0,
                shortDescription: "فيديو قبلة رومانسي بالذكاء الاصطناعي",
                longDescription: "ينشئ فيديو MP4 رومانسي يجمع صور البروفايل في مشهد قبلة بكشف الوجه AI",
                category: "fun",
                guide: "{pn} @ذكر أو رد على رسالة"
        },

        onStart: async function ({ message, event }) {
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

                        await message.reply("⏳ | جاري إنشاء الفيديو...");

                        const img1Path = path.join(tmpDir, "img1.jpg");
                        const img2Path = path.join(tmpDir, "img2.jpg");

                        await Promise.all([
                                fetchProfilePic(senderID, img1Path),
                                fetchProfilePic(targetID, img2Path)
                        ]);

                        const [box1, box2] = await Promise.all([
                                detectFace(img1Path),
                                detectFace(img2Path)
                        ]);

                        const [img1, img2] = await Promise.all([
                                loadImage(img1Path),
                                loadImage(img2Path)
                        ]);

                        const W = 780, H = 440, FPS = 24;
                        const TOTAL_FRAMES = Math.floor(FPS * 5.0);

                        for (let f = 0; f < TOTAL_FRAMES; f++) {
                                const progress = f / (TOTAL_FRAMES - 1);
                                const canvas = createCanvas(W, H);
                                const ctx = canvas.getContext("2d");
                                drawRomanticFrame(ctx, img1, img2, box1, box2, W, H, progress, senderName, targetName);
                                const framePath = path.join(tmpDir, `frame_${String(f).padStart(4, "0")}.png`);
                                fs.writeFileSync(framePath, canvas.toBuffer("image/png"));
                        }

                        const outputPath = path.join(tmpDir, "kiss_output.mp4");
                        execSync(
                                `ffmpeg -y -framerate ${FPS} -i "${path.join(tmpDir, "frame_%04d.png")}" ` +
                                `-vf "scale=${W}:${H}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputPath}"`,
                                { timeout: 90000 }
                        );

                        await message.reply({
                                body: `💋 | ${senderName} قبّل ${targetName} 💕`,
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
