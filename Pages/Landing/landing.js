// Simple animation logic for the board preview pieces
document.addEventListener('DOMContentLoaded', () => {
    const pieces = document.querySelectorAll('.preview-piece');
    
    // Floating animation with random intervals
    pieces.forEach((piece, index) => {
        const delay = index * 800;
        
        setInterval(() => {
            const randomY = Math.random() * 15 - 7.5;
            const randomX = Math.random() * 15 - 7.5;
            const randomRotate = Math.random() * 20 - 10;
            
            piece.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`;
        }, 2500 + delay);
    });
});