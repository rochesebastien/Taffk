import { useState } from 'react';
import { Link2, Plus, TextCursorInput, Trash2 } from 'lucide-react';
import { useSettings, type CustomField, type CustomFieldType } from '../../lib/settings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SettingsGroup, SettingRow } from './parts';

function FieldRow({ field }: { field: CustomField }) {
  const fields = useSettings((s) => s.customFields);
  const set = useSettings((s) => s.set);

  const [label, setLabel] = useState(field.label);

  function rename() {
    const name = label.trim();
    if (!name || name === field.label) {
      setLabel(field.label);
      return;
    }
    set(
      'customFields',
      fields.map((f) => (f.id === field.id ? { ...f, label: name } : f)),
    );
  }

  function setType(type: CustomFieldType) {
    set(
      'customFields',
      fields.map((f) => (f.id === field.id ? { ...f, type } : f)),
    );
  }

  function remove() {
    set(
      'customFields',
      fields.filter((f) => f.id !== field.id),
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={rename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          else if (e.key === 'Escape') {
            setLabel(field.label);
            e.currentTarget.blur();
          }
        }}
        className="flex-1"
      />
      <Select value={field.type} onValueChange={(v) => setType(v as CustomFieldType)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">
            <TextCursorInput /> Texte
          </SelectItem>
          <SelectItem value="link">
            <Link2 /> Lien
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive"
        onClick={remove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function CustomFieldsManager() {
  const fields = useSettings((s) => s.customFields);
  const set = useSettings((s) => s.set);

  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');

  function add() {
    const name = label.trim();
    if (!name) return;
    set('customFields', [...fields, { id: crypto.randomUUID(), label: name, type }]);
    setLabel('');
    setType('text');
  }

  return (
    <SettingsGroup title="Propriétés personnalisées des tâches">
      {fields.length === 0 ? (
        <SettingRow
          label="Aucune propriété"
          description="Ajoutez des champs (lien, texte…) qui apparaîtront sur toutes les tâches."
        />
      ) : (
        fields.map((f) => <FieldRow key={f.id} field={f} />)
      )}

      <div className="flex items-center gap-2 px-4 py-3.5">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="Nom du champ (ex. Lien)"
          className="flex-1"
        />
        <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">
              <TextCursorInput /> Texte
            </SelectItem>
            <SelectItem value="link">
              <Link2 /> Lien
            </SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={add} disabled={!label.trim()}>
          <Plus /> Ajouter
        </Button>
      </div>
    </SettingsGroup>
  );
}
