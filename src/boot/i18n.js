import { defineBoot } from '#q-app/wrappers'
import { createI18n } from 'vue-i18n'
import enUS from 'src/i18n/locales/en-US.json'

export default defineBoot(({ app }) => {
  const i18n = createI18n({
    locale: 'en-US',
    globalInjection: true,
    messages: {
      'en-US': enUS,
    },
  })

  // Set i18n instance on app
  app.use(i18n)
})
