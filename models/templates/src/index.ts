//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
//

import type { Domain } from '@anticrm/core'
import { Builder, Model, Prop, TypeString } from '@anticrm/model'
import core, { TDoc } from '@anticrm/model-core'
import textEditor from '@anticrm/model-text-editor'
import { IntlString } from '@anticrm/platform'
import setting from '@anticrm/setting'
import type { MessageTemplate } from '@anticrm/templates'
import templates from './plugin'

export const DOMAIN_TEMPLATES = 'templates' as Domain

@Model(templates.class.MessageTemplate, core.class.Doc, DOMAIN_TEMPLATES)
export class TMessageTemplate extends TDoc implements MessageTemplate {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string;

  @Prop(TypeString(), 'Message' as IntlString)
  message!: string;
}

export function createModel (builder: Builder): void {
  builder.createModel(TMessageTemplate)

  builder.createDoc(
    core.class.Space,
    core.space.Model,
    {
      name: 'Templates',
      description: 'Space for all templates',
      private: true,
      archived: false,
      members: []
    },
    templates.space.Templates
  )

  builder.createDoc(setting.class.SettingsCategory, core.space.Model, {
    name: 'message-templates',
    label: templates.string.Templates,
    icon: templates.icon.Templates,
    component: templates.component.Templates,
    order: 3500
  }, templates.ids.Templates)

  builder.createDoc(textEditor.class.RefInputActionItem, core.space.Model, {
    label: templates.string.Templates,
    icon: templates.icon.Templates,
    action: templates.action.ShowTemplates,
    order: 1500
  }, templates.ids.TemplatePopupAction)
}