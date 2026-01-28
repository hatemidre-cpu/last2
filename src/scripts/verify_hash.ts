import bcrypt from 'bcrypt';

const password = 'admin123';
const hash = '$2b$10$gTBGp7arL7E6BUwOuVRIXucdz.sAUKZvaeVy8wufXwLy../xBmT/y';

async function verify() {
    try {
        const match = await bcrypt.compare(password, hash);
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}`);
        console.log(`Match: ${match}`);
    } catch (err) {
        console.error('Error verifying hash:', err);
    }
}

verify();
