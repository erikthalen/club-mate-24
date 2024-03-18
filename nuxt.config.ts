// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["pruvious"],
  pruvious: {
    database: process.env.NUXT_PRUVIOUS_DATABASE,
    jwt: {
      secretKey: process.env.NUXT_PRUVIOUS_JWT_KEY
    }
  }
})