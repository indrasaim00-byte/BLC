const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { execSync } = require("child_process");

function drawHeart(ctx, cx, cy, size, color, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, cy + size * 0.3);
        ctx.bezierCurveTo(cx, cy, cx - size * 0.5, cy, cx - size * 0.5, cy + size * 0.3);
        ctx.bezierCurveTo(cx - size * 0.5, cy + size * 0.65, cx, cy + size * 0.9, cx, cy + size * 1.1);
        ctx.bezierCurveTo(cx, cy + size * 0.9, cx + size * 0.5, cy + size * 0.65, cx + size * 0.5, cy + size * 0.3);
        ctx.bezierCurveTo(cx + size * 0.5, cy, cx, cy, cx, cy + size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
}

function drawCircleImage(ctx, img, x, y, radius, tilt, glowColor) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
        ctx.restore();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
}

module.exports = {
        config: {
                name: "قبلة",
                aliases: ["kiss"],
                version: "3.0",
                author: "BlackBot",
                countDown: 12,
                role: 0,
                shortDescription: "فيديو قبلة متحرك بصور البروفايل",
                longDescription: "ينشئ GIF متحرك يجمع صور بروفايل الطرفين في مشهد قبلة",
                category: "fun",
                guide: "{pn} @ذكر أو رد على رسالة"
        },

        onStart: async function ({ message, event, api }) {
                try {
                        const mention = Object.keys(event.mentions || {});
                        let targetID;

                        if (event.messageReply) {
                                targetID = event.messageReply.senderID;
                        } else if (mention.length > 0) {
                                targetID = mention[0];
                        } else {
                                return message.reply("💋 | اذكر شخصاً أو رد على رسالته\nمثال: .قبلة @اسم");
                        }

                        const senderID = event.senderID;
                        const loadMsg = await message.reply("⏳ | جاري تجهيز الفيديو...");

                        const pic1Url = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&type=large`;
                        const pic2Url = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&type=large`;

                        const [res1, res2] = await Promise.all([
                                axios.get(pic1Url, { responseType: "arraybuffer", timeout: 10000 }),
                                axios.get(pic2Url, { responseType: "arraybuffer", timeout: 10000 })
                        ]);

                        const tmpDir = path.join(__dirname, `kiss_tmp_${Date.now()}`);
                        fs.mkdirSync(tmpDir, { recursive: true });

                        const img1Path = path.join(tmpDir, "img1.jpg");
                        const img2Path = path.join(tmpDir, "img2.jpg");
                        fs.writeFileSync(img1Path, Buffer.from(res1.data));
                        fs.writeFileSync(img2Path, Buffer.from(res2.data));

                        const img1 = await loadImage(img1Path);
                        const img2 = await loadImage(img2Path);

                        const W = 780, H = 440;
                        const TOTAL_FRAMES = 36;
                        const FPS = 12;
                        const RADIUS = 115;

                        const hearts = [];
                        for (let i = 0; i < 8; i++) {
                                hearts.push({
                                        x: W / 2 + (Math.random() - 0.5) * 200,
                                        y: H * 0.1 + Math.random() * H * 0.3,
                                        size: 12 + Math.random() * 18,
                                        speed: 0.5 + Math.random() * 1.5,
                                        offset: Math.random() * Math.PI * 2
                                });
                        }

                        for (let f = 0; f < TOTAL_FRAMES; f++) {
                                const canvas = createCanvas(W, H);
                                const ctx = canvas.getContext("2d");
                                const progress = f / (TOTAL_FRAMES - 1);

                                const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
                                bg.addColorStop(0, "#2d1b3d");
                                bg.addColorStop(0.5, "#1a0f2e");
                                bg.addColorStop(1, "#0d0820");
                                ctx.fillStyle = bg;
                                ctx.fillRect(0, 0, W, H);

                                for (let i = 0; i < 40; i++) {
                                        const sx = (i * 137.5) % W;
                                        const sy = (i * 89.3 + f * 0.5) % H;
                                        ctx.globalAlpha = 0.15 + (i % 3) * 0.05;
                                        ctx.fillStyle = "#ffffff";
                                        ctx.beginPath();
                                        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
                                        ctx.fill();
                                }
                                ctx.globalAlpha = 1;

                                let x1, x2, tilt1, tilt2, scale;

                                if (progress < 0.35) {
                                        const p = progress / 0.35;
                                        const ease = p * p;
                                        x1 = W * 0.16 + ease * W * 0.04;
                                        x2 = W * 0.84 - ease * W * 0.04;
                                        tilt1 = ease * 0.04;
                                        tilt2 = -ease * 0.04;
                                        scale = 1.0;
                                } else if (progress < 0.72) {
                                        const p = (progress - 0.35) / 0.37;
                                        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
                                        x1 = W * 0.20 + ease * W * 0.23;
                                        x2 = W * 0.80 - ease * W * 0.23;
                                        tilt1 = 0.04 + ease * 0.20;
                                        tilt2 = -(0.04 + ease * 0.20);
                                        scale = 1.0 + ease * 0.18;
                                } else {
                                        const p = (progress - 0.72) / 0.28;
                                        const ease = Math.sin(p * Math.PI / 2);
                                        x1 = W * 0.43 - ease * W * 0.01;
                                        x2 = W * 0.57 + ease * W * 0.01;
                                        tilt1 = 0.24 + ease * 0.06;
                                        tilt2 = -(0.24 + ease * 0.06);
                                        scale = 1.18 + ease * 0.04;
                                }

                                const r = RADIUS * scale;
                                const y = H * 0.52;

                                drawCircleImage(ctx, img1, x1, y, r, tilt1, "#ff69b4");
                                drawCircleImage(ctx, img2, x2, y, r, tilt2, "#c084fc");

                                if (progress > 0.5) {
                                        const heartProgress = (progress - 0.5) / 0.5;
                                        hearts.forEach((h, i) => {
                                                const floatY = h.y - f * h.speed;
                                                const floatX = h.x + Math.sin(f * 0.15 + h.offset) * 15;
                                                const alpha = heartProgress * (0.6 + Math.sin(f * 0.3 + h.offset) * 0.3);
                                                const clampedAlpha = Math.max(0, Math.min(1, alpha));
                                                const color = i % 2 === 0 ? "#ff69b4" : "#e879f9";
                                                drawHeart(ctx, floatX, ((floatY % H) + H) % H, h.size, color, clampedAlpha);
                                        });
                                }

                                if (progress > 0.68) {
                                        const kProgress = (progress - 0.68) / 0.32;
                                        ctx.save();
                                        ctx.globalAlpha = kProgress * 0.9;
                                        ctx.font = `bold ${Math.floor(28 + kProgress * 10)}px serif`;
                                        ctx.fillStyle = "#ff85c1";
                                        ctx.textAlign = "center";
                                        ctx.shadowColor = "#ff69b4";
                                        ctx.shadowBlur = 10;
                                        ctx.fillText("💋", W / 2, H * 0.16);
                                        ctx.restore();
                                }

                                if (progress > 0.75) {
                                        const lProgress = (progress - 0.75) / 0.25;
                                        ctx.save();
                                        ctx.globalAlpha = lProgress * 0.7;
                                        ctx.fillStyle = "#ff69b4";
                                        ctx.font = "bold 18px serif";
                                        ctx.textAlign = "center";
                                        ctx.fillText("❤️", W * 0.3, H * 0.82);
                                        ctx.fillText("❤️", W * 0.7, H * 0.82);
                                        ctx.restore();
                                }

                                const framePath = path.join(tmpDir, `frame_${String(f).padStart(3, "0")}.png`);
                                fs.writeFileSync(framePath, canvas.toBuffer("image/png"));
                        }

                        const outputPath = path.join(tmpDir, "kiss_output.gif");

                        execSync(
                                `ffmpeg -y -framerate ${FPS} -i "${path.join(tmpDir, "frame_%03d.png")}" ` +
                                `-filter_complex "[0:v] fps=${FPS},scale=${W}:${H}:flags=lanczos,split [a][b];[a] palettegen=max_colors=128:stats_mode=full [p];[b][p] paletteuse=dither=sierra2_4a" ` +
                                `"${outputPath}"`,
                                { timeout: 60000 }
                        );

                        const senderName = event.senderName || "أنت";
                        const targetName = (event.mentions || {})[targetID] || "الهدف";

                        try { api.unsendMessage(loadMsg.messageID); } catch (_) {}

                        await message.reply({
                                body: `💋 | ${senderName} قبّل ${targetName} 💕`,
                                attachment: fs.createReadStream(outputPath)
                        });

                        setTimeout(() => {
                                try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
                        }, 30000);

                } catch (err) {
                        console.error("[قبلة]", err.message || err);
                        message.reply("❌ | حدث خطأ أثناء إنشاء الفيديو، حاول مجدداً.");
                }
        }
};
