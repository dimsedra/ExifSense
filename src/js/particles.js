/**
 * Interactive Constellation Network background animation.
 * Renders a network of floating particles that connect with lines
 * and react to the user's mouse movements.
 */
export function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'constellation-canvas';
    
    // Inline styles to ensure it behaves correctly as a background
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-2'; // Behind all cards and constellation lines
    canvas.style.pointerEvents = 'none'; // Click-through
    canvas.style.display = 'block';
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    let particles = [];
    const maxDistance = 120; // Maximum distance to draw connecting lines
    const mouseRadius = 180;  // Radius of mouse attraction/interaction
    
    // Mouse state
    const mouse = {
        x: null,
        y: null,
        isActive: false
    };
    
    // Adjust particle density based on screen size
    function getParticleCount() {
        const area = window.innerWidth * window.innerHeight;
        // 1 particle per 15000 pixels on desktop, less on mobile for performance
        const baseCount = Math.floor(area / 16000);
        const maxParticles = window.innerWidth < 768 ? 35 : 75;
        return Math.min(baseCount, maxParticles);
    }
    
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Slow, floaty movements (forensic theme vibe)
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 1.5 + 1; // 1px to 2.5px radius
            
            // Faint grey-beige color to match the accent theme
            this.color = 'rgba(229, 224, 216, 0.25)'; 
            this.glowColor = 'rgba(255, 255, 255, 0.45)';
        }
        
        update() {
            // Magnetic attraction to mouse cursor if within range
            if (mouse.isActive && mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < mouseRadius) {
                    // Gentle pull towards the cursor
                    const force = (mouseRadius - dist) / mouseRadius;
                    this.x += (dx / dist) * force * 0.6;
                    this.y += (dy / dist) * force * 0.6;
                }
            }
            
            // Regular velocity update
            this.x += this.vx;
            this.y += this.vy;
            
            // Bounce/Wrap boundaries
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
            
            // Extra safety bounds check
            if (this.x < -10 || this.x > width + 10 || this.y < -10 || this.y > height + 10) {
                this.reset();
            }
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            // If near mouse, glow slightly brighter
            let isGlowing = false;
            if (mouse.isActive && mouse.x !== null && mouse.y !== null) {
                const dist = Math.hypot(mouse.x - this.x, mouse.y - this.y);
                if (dist < 100) isGlowing = true;
            }
            
            ctx.fillStyle = isGlowing ? this.glowColor : this.color;
            ctx.fill();
        }
    }
    
    function createParticles() {
        particles = [];
        const count = getParticleCount();
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }
    
    // Draw lines between close particles and to the mouse cursor
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            
            // 1. Connect to mouse
            if (mouse.isActive && mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - p1.x;
                const dy = mouse.y - p1.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < mouseRadius) {
                    const alpha = (1 - (dist / mouseRadius)) * 0.15; // Fade out as it gets further
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    // Light white line connecting to mouse
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
            
            // 2. Connect to other particles (avoiding duplicate checks)
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < maxDistance) {
                    const alpha = (1 - (dist / maxDistance)) * 0.08; // Very subtle faint connections
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(229, 224, 216, ${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
    }
    
    let animationFrameId;
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        drawConnections();
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    // Mouse Event Listeners
    const onMouseMove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.isActive = true;
    };
    
    const onMouseLeave = () => {
        mouse.isActive = false;
        mouse.x = null;
        mouse.y = null;
    };
    
    const onResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        createParticles();
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);
    
    // Initialize
    createParticles();
    animate();
    
    // Return a destroyer function to cleanup if switching states/destroying app
    return function destroy() {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('resize', onResize);
        if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    };
}
