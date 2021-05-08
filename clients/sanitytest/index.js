let tester = new SanityTester(document.body);

document.addEventListener('dragover', e => {
  e.preventDefault();
});

document.addEventListener('dragend', e => {
  e.preventDefault();
});

document.addEventListener('drop', e => {
  e.preventDefault();

  tester.loadDataTransfer(e.dataTransfer);
});

tester.loadAPI(window.location.search);
