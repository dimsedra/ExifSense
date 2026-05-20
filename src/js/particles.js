/**
 * particles.js - Interactive Forensic Constellation Network Background
 * High-performance canvas-based particles reacting to mouse and theme.
 */

export function initParticles() {
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    let animationFrameId = null;
    let particles = [];
    const mouse = { x: null, y: null, radius: 150 };

    // Styling constants based on theme
    let colors = getThemeColors();

    function getThemeColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            particle: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(100, 116, 139, 0.25)',
            line: isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(148, 163, 184, 0.12)',
            mouseLine: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.18)',
            accent: isDark ? 'rgba(6, 182, 212, 0.5)' : 'rgba(59, 130, 246, 0.35)'
        };
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticlesArray();
    }

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 1;
            this.pulseSpeed = 0.005 + Math.random() * 0.01;
            this.pulseVal = Math.random();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce or wrap
            if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
            if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

            // Update pulse for glowing nodes
            this.pulseVal += this.pulseSpeed;
        }

        draw() {
            const glow = this.radius * (1 + Math.sin(this.pulseVal) * 0.4);
            ctx.beginPath();
            ctx.arc(this.x, this.y, glow, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.98 ? colors.accent : colors.particle;
            ctx.fill();
        }
    }

    function initParticlesArray() {
        particles = [];
        const count = window.innerWidth < 768 ? 35 : 85;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function drawLines() {
        const maxDist = 130;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = colors.line.replace('0.08', (0.08 * alpha).toFixed(3)).replace('0.12', (0.12 * alpha).toFixed(3));
                    ctx.lineWidth = 0.75;
                    ctx.stroke();
                }
            }

            // Interactive mouse connections
            if (mouse.x !== null && mouse.y !== null) {
                const dx = particles[i].x - mouse.x;
                const dy = particles[i].y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius) {
                    const alpha = (1 - dist / mouse.radius) * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = colors.mouseLine.replace('0.15', (0.15 * alpha).toFixed(3)).replace('0.18', (0.18 * alpha).toFixed(3));
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        drawLines();
        animationFrameId = requestAnimationFrame(animate);
    }

    // Set up listeners
    window.addEventListener('resize', resize);
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Theme changes updates color system
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                colors = getThemeColors();
            }
        });
    });
    observer.observe(document.body, { attributes: true });

    // Initial setup
    resize();
    animate();
}
