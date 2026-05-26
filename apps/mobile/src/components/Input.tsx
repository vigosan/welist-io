import { forwardRef, type ReactNode } from "react";
import { TextInput, type TextInputProps, View } from "react-native";

type InputProps = TextInputProps & {
  className?: string;
};

/**
 * iOS Search Field style: filled background, no border, generous padding.
 * Works the same on iOS and Android (underline killed).
 */
export const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", style, ...rest }, ref) => {
    return (
      <TextInput
        ref={ref}
        underlineColorAndroid="transparent"
        placeholderTextColor="#a8a39a"
        textAlignVertical="center"
        style={[
          {
            height: 48,
            paddingTop: 0,
            paddingBottom: 0,
            fontSize: 16,
            lineHeight: 20,
          },
          style,
        ]}
        className={`rounded-2xl bg-gray-100 px-4 text-gray-900 dark:bg-gray-800 dark:text-gray-100 ${className}`}
        {...rest}
      />
    );
  }
);
Input.displayName = "Input";

type InputRowProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Container for an input with adjacent elements (icon, button).
 * Same filled-rounded look but takes children layout-wise.
 */
export function InputRow({ children, className = "" }: InputRowProps) {
  return (
    <View
      className={`flex-row items-center gap-1 rounded-2xl bg-gray-100 px-2 dark:bg-gray-800 ${className}`}
    >
      {children}
    </View>
  );
}
