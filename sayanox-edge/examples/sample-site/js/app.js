/**
 * Sayanox Sample Site — app.js
 * Plain, verbose JS so terser has something to minify.
 */
document.addEventListener('DOMContentLoaded', function () {
  var links = document.querySelectorAll('.site-header nav a');

  links.forEach(function (link) {
    link.addEventListener('click', function (event) {
      console.log('Clicked nav link:', link.getAttribute('href'));
    });
  });

  // Simple "back to top" behavior
  var footer = document.querySelector('footer');
  if (footer) {
    footer.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Unused variable on purpose — terser will drop it
  var unusedDebugFlag = true;
});
