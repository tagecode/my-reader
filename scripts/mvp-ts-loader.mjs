const stubUrl = new URL('./mvp-electron-stub.mjs', import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'electron') {
    return {
      shortCircuit: true,
      url: stubUrl.href,
    }
  }

  const isRelative =
    specifier.startsWith('.') || specifier.startsWith('/')
  const hasExtension = /[.][a-zA-Z0-9]+$/.test(specifier)

  if (isRelative && !hasExtension) {
    const candidates = [
      specifier,
      `${specifier}.ts`,
      `${specifier}/index.ts`,
    ]
    let lastError
    for (const candidate of candidates) {
      try {
        return await nextResolve(candidate, context)
      } catch (err) {
        lastError = err
      }
    }
    throw lastError
  }

  return nextResolve(specifier, context)
}
