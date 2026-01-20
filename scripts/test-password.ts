import bcrypt from 'bcrypt';

const password = 'admin123';
const hashFromDB = '$2b$10$rKvVXFzQMxJn4vYGGm1XF.VqYXzVtGhqxQDJfGYlvWzM3hTXfGPje';

console.log('🔐 Testando senha...\n');

// Test if hash matches
bcrypt.compare(password, hashFromDB).then(matches => {
  console.log(`Senha: ${password}`);
  console.log(`Hash: ${hashFromDB}`);
  console.log(`Match: ${matches ? '✅ SIM' : '❌ NÃO'}\n`);
  
  if (!matches) {
    console.log('Gerando novo hash...');
    bcrypt.hash(password, 10).then(newHash => {
      console.log(`Novo hash: ${newHash}\n`);
      console.log('❗ Atualize o seed SQL com este novo hash!');
    });
  }
});

// Test direct API call
console.log('🌐 Testando API...\n');
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
})
  .then(res => res.json())
  .then(data => {
    console.log('Resposta da API:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('❌ Erro na API:', err.message);
  });
