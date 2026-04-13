declare module 'react-file-icon' {
  import type { FunctionComponent } from 'react';

  export type IconType =
    | '3d'
    | 'acrobat'
    | 'android'
    | 'audio'
    | 'binary'
    | 'code'
    | 'code2'
    | 'compressed'
    | 'document'
    | 'drive'
    | 'font'
    | 'image'
    | 'presentation'
    | 'settings'
    | 'spreadsheet'
    | 'vector'
    | 'video';

  export interface FileIconProps {
    color?: string;
    extension?: string;
    fold?: boolean;
    foldColor?: string;
    glyphColor?: string;
    gradientColor?: string;
    gradientOpacity?: number;
    labelColor?: string;
    labelTextColor?: string;
    labelTextStyle?: object;
    labelUppercase?: boolean;
    radius?: number;
    type?: IconType;
  }

  export const defaultStyles: {
    [extension: string]: Partial<FileIconProps> | undefined;
  };

  export const FileIcon: FunctionComponent<FileIconProps>;
}
