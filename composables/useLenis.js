import Lenis from '@studio-freight/lenis'

const useCurrentScroll = () => useState('current-scroll', () => 0)

export default () => {
  const lenis = ref(null)
  const currentScroll = useCurrentScroll()

  if (!lenis.value && process.client) {
    lenis.value = new Lenis({ lerp: 0.1 })

    lenis.value.on('scroll', e => {
      currentScroll.value = e.animatedScroll
    })

    function raf(time) {
      lenis.value.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)
  }

  return {
    currentScroll,
  }
}
