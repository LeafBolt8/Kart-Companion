document.addEventListener('DOMContentLoaded', function() {
    // Image preview modal logic
    const images = document.querySelectorAll('.feature-image');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    images.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
            modalImg.src = this.src;
            modal.classList.add('active');
        });
    });
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            modalImg.src = '';
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
            modalImg.src = '';
        }
    });
}); 