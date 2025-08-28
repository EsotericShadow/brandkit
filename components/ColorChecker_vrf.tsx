import React, { useState, useMemo } from 'react';
import Card from './common/Card_vrf';

// Helper function to parse hex/rgb to an array of RGB values
const parseColor = (color: string): [number, number, number] | null => {
    color = color.trim();
    if (color.startsWith('#')) {
        color = color.substring(1);
        if (color.length === 3) {
            color = color.split('').map(c => c + c).join('');
        }
        if (color.length === 6) {
            const r = parseInt(color.substring(0, 2), 16);
            const g = parseInt(color.substring(2, 4), 16);
            const b = parseInt(color.substring(4, 6), 16);
            return [r, g, b];
        }
    }
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    }
    return null;
};

// Helper function to calculate luminance
const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

// Main function to get contrast ratio
const getContrastRatio = (color1: string, color2: string): number | null => {
    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);

    if (!rgb1 || !rgb2) return null;

    const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
};

const ContrastResult: React.FC<{ label: string; pass: boolean }> = ({ label, pass }) => (
    <div className="flex justify-between items-center text-sm">
        <span>{label}</span>
        <span className={`font-bold ${pass ? 'text-green-500' : 'text-red-500'}`}>
            {pass ? 'Pass' : 'Fail'}
        </span>
    </div>
);

const ColorChecker: React.FC = () => {
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [bgColor, setBgColor] = useState('#171717');

    const { ratio, aaNormal, aaLarge, aaaNormal, aaaLarge, isValid } = useMemo(() => {
        const contrastRatio = getContrastRatio(textColor, bgColor);
        if (contrastRatio === null) {
            return { ratio: 1, aaNormal: false, aaLarge: false, aaaNormal: false, aaaLarge: false, isValid: false };
        }
        return {
            ratio: contrastRatio,
            aaNormal: contrastRatio >= 4.5,
            aaLarge: contrastRatio >= 3,
            aaaNormal: contrastRatio >= 7,
            aaaLarge: contrastRatio >= 4.5,
            isValid: true,
        };
    }, [textColor, bgColor]);

    return (
         <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white mb-2">Accessibility Color Checker</h1>
            <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-8">
                Ensure your color combinations meet WCAG contrast guidelines.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="text-color" className="block text-sm font-medium">Text Color</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={/^#([0-9a-fA-F]{6})$/.test(textColor) ? textColor : '#000000'} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-9 p-0 border border-neutral-300 dark:border-neutral-700 rounded-md bg-transparent"/>
                              <input id="text-color" type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} onBlur={(e) => { const v = e.target.value.trim(); const m = v.match(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/); if (m) { let h = v.startsWith('#') ? v.slice(1) : v; if (h.length===3) h=h.split('').map(c=>c+c).join(''); setTextColor(`#${h.toUpperCase()}`);} }} className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="background-color" className="block text-sm font-medium">Background Color</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={/^#([0-9a-fA-F]{6})$/.test(bgColor) ? bgColor : '#000000'} onChange={(e) => setBgColor(e.target.value)} className="h-9 w-9 p-0 border border-neutral-300 dark:border-neutral-700 rounded-md bg-transparent"/>
                              <input id="background-color" type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} onBlur={(e) => { const v = e.target.value.trim(); const m = v.match(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/); if (m) { let h = v.startsWith('#') ? v.slice(1) : v; if (h.length===3) h=h.split('').map(c=>c+c).join(''); setBgColor(`#${h.toUpperCase()}`);} }} className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700"/>
                            </div>
                        </div>
                    </div>
                     <Card className="mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-bold">Contrast Ratio</span>
                            <span className="text-2xl font-bold">{isValid ? ratio.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div className="space-y-2">
                           <ContrastResult label="AA Normal Text" pass={aaNormal} />
                           <ContrastResult label="AA Large Text (18pt+)" pass={aaLarge} />
                           <ContrastResult label="AAA Normal Text" pass={aaaNormal} />
                           <ContrastResult label="AAA Large Text (18pt+)" pass={aaaLarge} />
                        </div>
                    </Card>
                </Card>
                 <Card>
                     <div
                        className="w-full h-full rounded-md flex flex-col justify-center items-center p-6 min-h-[300px]"
                        style={{ backgroundColor: isValid ? bgColor : '#f0f0f0', color: isValid ? textColor : '#000000' }}
                    >
                       <h3 className="text-2xl font-bold">Large Text Example</h3>
                       <p className="mt-2 text-base">
                            This is an example of normal body text. The quick brown fox jumps over the lazy dog.
                       </p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ColorChecker;

