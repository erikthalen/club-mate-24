// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["pruvious"],
  pruvious: {
    database: process.env.NUXT_PRUVIOUS_DATABASE,
    jwt: {
      secretKey: "J7cYZrfdWCGlJMG0D6kQdIAIF8m4bSGEjezglrGrpWZQaLQLinmAf_dMo5LkoK8B"
    }
  }
})