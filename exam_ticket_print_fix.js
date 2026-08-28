(() => {
  const nativePrint = window.print.bind(window);
  let printScheduled = false;

  function waitForImage_(img) {
    const decode_ = () => {
      if (img.naturalWidth > 0 && typeof img.decode === 'function') {
        return img.decode().catch(() => {});
      }
      return Promise.resolve();
    };

    if (img.complete) return decode_();

    return new Promise(resolve => {
      let timer = null;
      const finish = () => {
        img.removeEventListener('load', finish);
        img.removeEventListener('error', finish);
        if (timer) clearTimeout(timer);
        resolve();
      };
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      timer = setTimeout(finish, 5000);
    }).then(decode_);
  }

  function waitForPaint_() {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  window.print = function stepExamTicketSafePrint_() {
    if (printScheduled) return;
    printScheduled = true;

    const images = [...document.querySelectorAll('#printArea img')];
    Promise.all(images.map(waitForImage_))
      .then(waitForPaint_, waitForPaint_)
      .then(() => nativePrint())
      .finally(() => {
        printScheduled = false;
      });
  };
})();
