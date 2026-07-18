import { useState } from 'react';
import { Modal, Pressable, View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './FilterSelect.styles';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: readonly FilterOption[] | FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  captionColor: string;
  menuBackground: string;
}

export const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  borderColor,
  backgroundColor,
  textColor,
  captionColor,
  menuBackground,
}: FilterSelectProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  return (
    <View style={styles.root}>
      <Text style={[styles.caption, { color: captionColor }]}>{label}</Text>
      <Pressable
        style={[styles.control, { borderColor, backgroundColor }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.value, { color: textColor }]} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={16} color={captionColor} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 }}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.menu,
              {
                position: 'relative',
                top: 0,
                marginTop: 0,
                borderColor,
                backgroundColor: menuBackground,
                maxHeight: 320,
              },
            ]}
          >
            <FlatList
              data={[...options]}
              keyExtractor={(item) => item.value || 'all'}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: textColor,
                        fontWeight: item.value === value ? '700' : '400',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
