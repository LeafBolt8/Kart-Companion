document.addEventListener('DOMContentLoaded', function() {
    const questions = document.querySelectorAll('.faq-question');
    
    questions.forEach(question => {
        question.addEventListener('click', () => {
            // Get the answer element
            const answer = question.nextElementSibling;
            const toggle = question.querySelector('.faq-toggle');
            
            // Toggle the active class on the answer
            if (answer.style.display === 'block') {
                answer.style.display = 'none';
                toggle.textContent = '▼';
            } else {
                answer.style.display = 'block';
                toggle.textContent = '▲';
            }
        });
    });
}); 