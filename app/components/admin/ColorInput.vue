<script setup lang="ts">
// A colour as a hex code: type or paste it (#FF5F1F, FF5F1F, #F51) or pick it from the swatch in the system's picker.
// Empty is no colour. The model only ever takes a valid code; a broken one rims red and goes back when the field is left
const model = defineModel<string | null>({ default: null })

const toHex = (v: string) => {
  const s = v.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s.replace(/./g, '$&$&')}`
}

const text = ref(model.value ?? '')
const broken = computed(() => !!text.value.trim() && !toHex(text.value))
watch(model, (v) => v !== toHex(text.value) && (text.value = v ?? ''))

function onText(v: string | number | null) {
  text.value = String(v ?? '')
  if (!text.value.trim()) model.value = null
  else if (!broken.value) model.value = toHex(text.value)!
}
</script>

<template>
  <div class="flex gap-2">
    <label class="kd-swatch kd-press relative grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg text-neutral-11" :style="{ background: model ?? undefined }" title="Pick a colour">
      <UiIcon v-if="!model" name="plus" :size="16" />
      <input type="color" class="absolute inset-0 size-full cursor-pointer opacity-0" :value="model ?? '#ff5f1f'" aria-label="Pick a colour" @input="model = ($event.target as HTMLInputElement).value" />
    </label>
    <UiInput :model-value="text" class="flex-1" placeholder="None" uppercase clearable :error="broken" @update:model-value="onText" @focusout="text = model ?? ''" />
  </div>
</template>

<style scoped>
.kd-swatch {
  border: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-1);
  transition: border-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-swatch:hover {
    border-color: var(--color-neutral-6);
  }
}
.kd-swatch:focus-within {
  border-color: var(--color-brand-base);
}
</style>
