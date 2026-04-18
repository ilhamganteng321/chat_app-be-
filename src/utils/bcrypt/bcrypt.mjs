import bcrypt from 'bcrypt'
const saltRound = 10;

export const hashPassword = (password) => {
    return bcrypt.hashSync(password, saltRound)
}

export const comparePassword = (password, hash) => {
    return bcrypt.compareSync(password, hash);
}

