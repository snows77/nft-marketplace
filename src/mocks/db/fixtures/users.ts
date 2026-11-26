// Usuários fictícios da demo. Senha de ambos: Kurio@123
// Os hashes foram gerados com sha256("<salt>:Kurio@123"); a senha em si não é guardada.

export interface DbUser {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  salt: string
  passwordHash: string
}

export function buildUsers(): DbUser[] {
  return [
    {
      id: 'user-ana',
      username: 'ana',
      email: 'ana@kurio.dev',
      avatarUrl: null,
      salt: 's4lt-ana-01',
      passwordHash: '6dc229f0d749cf0821133058b238256f86b536ef4b5c18a7e9a7efe59439dd0e',
    },
    {
      id: 'user-bruno',
      username: 'bruno',
      email: 'bruno@kurio.dev',
      avatarUrl: null,
      salt: 's4lt-bruno-02',
      passwordHash: '35bb74146abc4b980215fb9b943fc2a2db1d4b3a013b7022c717bdea45c4f2c2',
    },
  ]
}
