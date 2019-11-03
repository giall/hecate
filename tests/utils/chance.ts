import * as Chance from 'chance';

const chance = new Chance();
chance.username = () => chance.string({alpha: true, length: 10});
chance.password = () => chance.string({length: 10});
chance.emailAddress = () => chance.email({domain: 'hecate.com'});

export { chance };