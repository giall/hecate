import * as Chance from 'chance';

const chance = new Chance();
chance.username = () => chance.string({alpha: true, length: 5});
chance.password = () => chance.string({length: 10});

export { chance };