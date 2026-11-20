import React, { forwardRef } from 'react';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

export type SignaturePadRef = { clearSignature: () => void; readSignature: () => void };

type Props = {
  onOK: (base64: string) => void;
  penColor: string;
  backgroundColor: string;
};

// Native: WebView-based signature canvas.
const SignaturePad = forwardRef<SignaturePadRef, Props>(({ onOK, penColor, backgroundColor }, ref) => (
  <SignatureScreen
    ref={ref as React.Ref<SignatureViewRef>}
    onOK={onOK}
    webStyle={`
      .m-signature-pad { box-shadow: none; border: none; margin: 0; padding: 0; }
      .m-signature-pad--body { border: none; }
      .m-signature-pad--footer { display: none; }
    `}
    backgroundColor={backgroundColor}
    penColor={penColor}
    minWidth={1}
    maxWidth={4}
    dotSize={1}
  />
));

export default SignaturePad;
