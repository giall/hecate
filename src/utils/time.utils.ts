import * as ms from 'ms';

function seconds(value: string) {
  return ms(value) / 1000;
}

export { seconds }
