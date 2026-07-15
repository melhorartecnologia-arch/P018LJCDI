// Configuração do PM2 para produção (VPS, sem Docker).
//   pm2 start ecosystem.config.cjs
//
// A aplicação lê TODA a configuração de variáveis de ambiente / arquivo .env
// na raiz do projeto (PORT, HOST, DATABASE_URL, ANTHROPIC_API_KEY, ...) — veja
// .env.example. Este arquivo só diz ao PM2 como manter o processo no ar.
module.exports = {
  apps: [
    {
      name: 'cidade-imperial',
      script: 'server/src/index.js',
      cwd: __dirname,
      // 1 instância em modo fork: o estado da aplicação é sincronizado por
      // /api/state (substituição transacional) — não usar cluster/múltiplas
      // instâncias para não haver corrida entre gravações.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      env: { NODE_ENV: 'production' },
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
      merge_logs: true,
      time: true,
    },
  ],
}
