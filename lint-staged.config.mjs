const config = {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{json,md,mdx,css,html,yml,yaml}": ["prettier --write"],
};

export default config;
