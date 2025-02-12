<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import contact, { Contact, getName } from '@hcengineering/contact'
  import core, { Class, ClassifierKind, Doc, Mixin, Obj, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { Asset, getResource, translate } from '@hcengineering/platform'
  import {
    AttributeCategory,
    AttributeCategoryOrder,
    AttributesBar,
    KeyedAttribute,
    ActionContext,
    createQuery,
    getAttributePresenterClass,
    getClient,
    hasResource
  } from '@hcengineering/presentation'
  import { AnyComponent, Button, Component, IconMixin, IconMoreH, showPopup, themeStore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { ContextMenu, ParentsNavigator } from '..'
  import { categorizeFields, getCollectionCounter, getFiltredKeys } from '../utils'
  import DocAttributeBar from './DocAttributeBar.svelte'
  import UpDownNavigator from './UpDownNavigator.svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let embedded = false

  let realObjectClass: Ref<Class<Doc>> = _class
  let lastId: Ref<Doc> = _id
  let object: Doc

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      notificationClient.then((client) => client.read(prev))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.read(_id))
  })

  const query = createQuery()
  $: updateQuery(_id, _class)

  function updateQuery (_id: Ref<Doc>, _class: Ref<Class<Doc>>) {
    if (_id && _class) {
      query.query(_class, { _id }, (result) => {
        object = result[0]
        if (object != null) {
          realObjectClass = object._class
        }
      })
    } else {
      query.unsubscribe()
    }
  }

  let oldClass: Ref<Class<Doc>>

  $: if (_class !== oldClass) {
    oldClass = _class
    mainEditor = undefined
  }

  let keys: KeyedAttribute[] = []
  let fieldEditors: { key: KeyedAttribute; editor: AnyComponent; category: AttributeCategory }[] = []

  let mixins: Mixin<Doc>[] = []

  let showAllMixins = false

  const dispatch = createEventDispatcher()

  function getMixins (object: Doc, showAllMixins: boolean): void {
    if (object === undefined) return
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        !ignoreMixins.has(m._id) &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins &&
            hierarchy.isDerived(realObjectClass, hierarchy.getBaseClass(m._id)) &&
            (m.extends && hierarchy.isMixin(m.extends) ? hierarchy.hasMixin(object, m.extends) : true)))
    )
  }

  $: getMixins(object, showAllMixins)

  let ignoreKeys: string[] = []
  let activityOptions = { enabled: true, showInput: true }
  let allowedCollections: string[] = []
  let collectionArrays: string[] = []
  let inplaceAttributes: string[] = []
  let ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  async function updateKeys (): Promise<void> {
    const keysMap = new Map(getFiltredKeys(hierarchy, realObjectClass, ignoreKeys).map((p) => [p.attr._id, p]))
    for (const m of mixins) {
      const mkeys = getFiltredKeys(hierarchy, m._id, ignoreKeys)
      for (const key of mkeys) {
        keysMap.set(key.attr._id, key)
      }
    }
    const filtredKeys = Array.from(keysMap.values())
    const { attributes, collections } = categorizeFields(hierarchy, filtredKeys, collectionArrays, allowedCollections)

    keys = attributes.map((it) => it.key)

    const editors: { key: KeyedAttribute; editor: AnyComponent; category: AttributeCategory }[] = []
    const newInplaceAttributes: string[] = []
    for (const k of collections) {
      if (allowedCollections.includes(k.key.key)) continue
      const editor = await getFieldEditor(k.key)
      if (editor === undefined) continue
      if (k.category === 'inplace') {
        newInplaceAttributes.push(k.key.key)
      }
      editors.push({ key: k.key, editor, category: k.category })
    }
    inplaceAttributes = newInplaceAttributes
    fieldEditors = editors.sort((a, b) => AttributeCategoryOrder[a.category] - AttributeCategoryOrder[b.category])
  }

  interface MixinEditor {
    editor: AnyComponent
    pinned?: boolean
  }

  function getEditor (_class: Ref<Class<Doc>>): MixinEditor {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return { editor: editorMixin.editor, pinned: editorMixin?.pinned }
  }

  function getEditorFooter (_class: Ref<Class<Doc>>): { footer: AnyComponent; props?: Record<string, any> } | undefined {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditorFooter)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditorFooter(clazz.extends)
    if (editorMixin.editor) {
      return { footer: editorMixin.editor, props: editorMixin?.props }
    }
    return undefined
  }

  let mainEditor: MixinEditor | undefined

  $: editorFooter = getEditorFooter(_class)

  $: getEditorOrDefault(realObjectClass, _id)

  async function getEditorOrDefault (_class: Ref<Class<Doc>>, _id: Ref<Doc>): Promise<void> {
    await updateKeys()
    mainEditor = getEditor(_class)
  }

  async function getFieldEditor (key: KeyedAttribute): Promise<AnyComponent | undefined> {
    const attrClass = getAttributePresenterClass(hierarchy, key.attr)
    const clazz = hierarchy.getClass(attrClass.attrClass)
    const mix = {
      array: view.mixin.ArrayEditor,
      collection: view.mixin.CollectionEditor,
      inplace: view.mixin.InlineAttributEditor,
      attribute: view.mixin.AttributeEditor,
      object: undefined
    }
    const mixinRef = mix[attrClass.category]
    if (mixinRef) {
      const editorMixin = hierarchy.as(clazz, mixinRef)
      return (editorMixin as any).editor
    } else {
      return undefined
    }
  }

  function getIcon (_class: Ref<Class<Obj>> | undefined): Asset | undefined {
    if (_class === undefined) return undefined
    let clazz = hierarchy.getClass(_class)
    if (clazz.icon !== undefined) return clazz.icon
    while (clazz.extends !== undefined) {
      clazz = hierarchy.getClass(clazz.extends)
      if (clazz.icon != null) {
        return clazz.icon
      }
    }
    // throw new Error(`Icon not found for ${_class}`)
  }

  $: icon = getIcon(realObjectClass)

  let title: string = ''
  let rawTitle: string = ''

  $: if (object !== undefined) {
    getTitle(object).then((t) => {
      rawTitle = t
    })
  }

  async function getTitle (object: Doc): Promise<string> {
    const name = (object as any).name
    if (name !== undefined) {
      if (hierarchy.isDerived(object._class, contact.class.Person)) {
        return getName(client.getHierarchy(), object as Contact)
      }
      return name
    }
    const label = hierarchy.getClass(object._class).label
    return await translate(label, {}, $themeStore.language)
  }

  async function getHeaderEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent | undefined> {
    const editorMixin = hierarchy.classHierarchyMixin(_class, view.mixin.ObjectEditorHeader, (m) =>
      hasResource(m.editor)
    )
    return editorMixin?.editor
  }

  let headerEditor: AnyComponent | undefined = undefined
  let headerLoading = false
  $: {
    headerLoading = true
    getHeaderEditor(realObjectClass).then((r) => {
      headerEditor = r
      headerLoading = false
    })
  }

  const _update = (result: any): void => {
    dispatch('update', result)
  }
  let panelWidth: number = 0
  let innerWidth: number = 0

  function showMenu (ev?: Event): void {
    if (object !== undefined) {
      showPopup(ContextMenu, { object, excludedActions: [view.action.Open] }, (ev as MouseEvent).target as HTMLElement)
    }
  }
  function handleOpen (ev: CustomEvent): void {
    ignoreKeys = ev.detail.ignoreKeys
    activityOptions = ev.detail.activityOptions ?? activityOptions
    ignoreMixins = new Set(ev.detail.ignoreMixins)
    allowedCollections = ev.detail.allowedCollections ?? []
    collectionArrays = ev.detail.collectionArrays ?? []
    title = ev.detail.title
    getMixins(object, showAllMixins)
    updateKeys()
  }

  $: finalTitle = title ?? rawTitle
</script>

{#if !embedded}
  <ActionContext
    context={{
      mode: 'editor'
    }}
  />
{/if}

{#if object !== undefined && finalTitle !== undefined}
  <Panel
    {icon}
    title={finalTitle}
    {object}
    {embedded}
    isHeader={mainEditor?.pinned ?? false}
    isAside={true}
    bind:panelWidth
    bind:innerWidth
    on:open
    on:update={(ev) => _update(ev.detail)}
    on:close={() => {
      dispatch('close')
    }}
    withoutActivity={!activityOptions.enabled}
    withoutInput={!activityOptions.showInput}
  >
    <svelte:fragment slot="navigator">
      {#if !embedded}
        <UpDownNavigator element={object} />
        <ParentsNavigator element={object} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button icon={IconMoreH} kind={'ghost'} size={'medium'} on:click={showMenu} />
      <Button
        icon={IconMixin}
        kind={'ghost'}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if !headerLoading}
        {#if headerEditor !== undefined}
          <Component
            is={headerEditor}
            props={{ object, keys, mixins, ignoreKeys, vertical: dir === 'column', allowedCollections, embedded }}
            on:update={updateKeys}
          />
        {:else if dir === 'column'}
          <DocAttributeBar
            {object}
            {mixins}
            ignoreKeys={[...ignoreKeys, ...collectionArrays, ...inplaceAttributes]}
            {allowedCollections}
            on:update={updateKeys}
          />
        {:else}
          <AttributesBar {object} _class={realObjectClass} {keys} />
        {/if}
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="header">
      {#if mainEditor && mainEditor.pinned}
        <div class="flex-col flex-grow my-4">
          <Component is={mainEditor.editor} props={{ object }} on:open={handleOpen} />
        </div>
      {/if}
    </svelte:fragment>

    {#if mainEditor && !mainEditor.pinned}
      <div class="flex-col flex-grow flex-no-shrink step-tb-6">
        <Component is={mainEditor.editor} props={{ object }} on:open={handleOpen} />
      </div>
    {/if}

    {#each fieldEditors as collection}
      {#if collection.editor}
        <div class="step-tb-6">
          <Component
            is={collection.editor}
            props={{
              objectId: object._id,
              _class: collection.key.attr.attributeOf,
              object,
              space: object.space,
              key: collection.key,
              [collection.key.key]: getCollectionCounter(hierarchy, object, collection.key)
            }}
          />
        </div>
      {/if}
    {/each}
    {#if editorFooter}
      <div class="step-tb-6">
        <Component is={editorFooter.footer} props={{ object, _class, ...editorFooter.props }} />
      </div>
    {/if}
  </Panel>
{/if}
