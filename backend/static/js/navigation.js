document.querySelectorAll('#nav-tabs a')
.forEach(link => {

    link.addEventListener(
        'click',
        function(e){

            e.preventDefault();

            document
            .querySelectorAll('#nav-tabs a')
            .forEach(
                l => l.classList.remove('active')
            );

            this.classList.add('active');

            const pageName =
                this.dataset.page;

            document
            .querySelectorAll('.module-page')
            .forEach(
                p => p.classList.remove('active')
            );

            document
            .getElementById(
                'page-' + pageName
            )
            .classList
            .add('active');
        }
    );
});