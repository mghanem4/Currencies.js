document.addEventListener('DOMContentLoaded', () => {
    const baseCurrencySelect = document.getElementById('baseCurrency');
    if (baseCurrencySelect) {
      const currentBase = baseCurrencySelect.dataset.current;
      Array.from(baseCurrencySelect.options).forEach(option => {
        if (option.value === currentBase) {
          option.selected = true;
        }
      });
    }
  });