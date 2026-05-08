const calculateScore = require('../utils/calculateScore');

describe('calculateScore', () => {
  test('calcula correctamente el scoring global', () => {
    expect(calculateScore(80, 70, 90)).toBe(80);
  });

  test('redondea correctamente el resultado', () => {
    expect(calculateScore(75, 66, 88)).toBe(76);
  });

  test('lanza error si algún valor no es numérico', () => {
    expect(() => calculateScore('80', 70, 90)).toThrow(
      'Todos los valores deben ser numéricos'
    );
  });
});