/** PM2: copy to server or run from repo with adjusted cwd.
 *  pm2 start pm2.recallsatlas.config.cjs
 *  pm2 save
 */
module.exports = {
  apps: [
    {
      name: "recallsatlas",
      cwd: "/var/www/html/recallsatlas",
      script: "npm",
      args: "start",
      interpreter: "/root/.nvm/versions/node/v20.20.2/bin/node",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
