        document.addEventListener('DOMContentLoaded', function() {
            // Adiciona ano atual no footer se existir
            const currentYear = new Date().getFullYear();
            const yearElement = document.querySelector('.last-update');
            if (yearElement) {
                yearElement.textContent = `Última atualização: 15 de Dezembro de ${currentYear}`;
            }
        });