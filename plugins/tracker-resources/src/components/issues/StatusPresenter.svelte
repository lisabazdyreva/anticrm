<!--
// Copyright © 2022 Hardcore Engineering Inc.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let value: IssueStatus | undefined
  export let space: Ref<Project>
  export let size: 'small' | 'medium' = 'small'
  export let kind: 'list-header' | undefined = undefined
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let inline: boolean = false
</script>

{#if value}
  <div class="flex-presenter cursor-default" style:color={'inherit'}>
    {#if !inline}
      <IssueStatusIcon {value} {size} {space} on:accent-color />
    {/if}
    <span
      class="overflow-label"
      class:ml-2={!inline}
      class:list-header={kind === 'list-header'}
      class:colorInherit
      class:fs-bold={accent}
    >
      {value.name}
    </span>
  </div>
{/if}

<style lang="scss">
  .list-header:not(.colorInherit) {
    color: var(--theme-content-color);
  }
  .list-header.colorInherit {
    color: inherit;
  }
</style>
