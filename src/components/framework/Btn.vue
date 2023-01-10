<template>
  <button type="button" class="btn" @click="!loading && $emit('click', $event)">
    <loader v-if="loading" class="btn__loader" small />
    <slot />
  </button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Loader from '@/components/framework/Loader.vue'

@Component({
  name: 'Btn',
  components: {
    Loader
  },
  props: {
    loading: {
      type: Boolean,
      required: true
    },
    type: {
      type: String,
      default: 'button'
    }
  }
})
export default class extends Vue {}
</script>

<style lang="scss" scoped>
.btn {
  &__loader {
    margin-top: -0.25rem;
    margin-bottom: -0.25rem;
    margin-left: 0.5rem;

    &:first-child {
      margin: 0;

      + * {
        display: none;
      }
    }
  }
}
</style>
