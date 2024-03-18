<template>
  <PruviousHTML :html="text" />
</template>

<script lang="ts" setup>
import { editorField } from '#pruvious'

defineProps({
  text: editorField({
    label: 'Text',
    placeholder: 'Bla bla',
    blockFormats: [
      { className: 'p-6 border rounded', label: 'Boxed', tags: ['div'] },
    ],
    inlineFormats: [{ className: 'text-red-500', label: 'Red' }],
    toolbar: [
      'bold',
      'italic',
      'heading2',
      'heading3',
      'paragraph',
      'link',
      'blockFormats',
      'inlineFormats',
      'clear',
    ],
    required: true,
  }),
})
</script>
