<script setup lang="ts">
// Prototype tool: every Forge effect in its own tile, looping, to pick effects by eye (linked from /debug).
useHead({ title: 'Forge FX · KurwaDROP' })
const names = ref<string[]>([])
const tiles = ref<HTMLElement[]>([])
const fx = useForge()

onMounted(async () => {
  await fx.preload('aura')
  names.value = window.Forge?.names ?? []
  await nextTick()
  names.value.forEach((n, i) => tiles.value[i] && fx.play(n, { el: tiles.value[i], loop: true }))
})
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:px-0 lg:pt-10">
    <h1 class="type-20-caps">Forge FX</h1>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <div v-for="(n, i) in names" :key="n" class="flex flex-col gap-1">
        <div :ref="(el) => el && (tiles[i] = el as HTMLElement)" class="aspect-square rounded-2xl bg-neutral-2" />
        <span class="type-12 text-neutral-12">{{ n }}</span>
      </div>
    </div>
  </div>
</template>
