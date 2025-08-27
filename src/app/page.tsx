// =======================================================================
// PENTING: PASTIKAN BARIS DI BAWAH INI ADALAH BARIS PERTAMA DI FILE ANDA.
// JANGAN HAPUS ATAU PINDAHKAN.
// Ini memberitahu Next.js untuk menjalankan komponen di browser,
// yang wajib untuk menggunakan hook seperti useState dan useEffect.
"use client";
// =======================================================================

import React, { useState, useCallback, useEffect } from 'react';

// Helper function to format bytes into a readable string (KB, MB)
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Main App Component
export default function App() {
    // State management using React Hooks
    const [files, setFiles] = useState([]);
    const [optimizedImages, setOptimizedImages] = useState([]);
    const [quality, setQuality] = useState(85);
    const [isLoading, setIsLoading] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // Effect to load JSZip script on the client side and set document title
    useEffect(() => {
        setIsClient(true);
        document.title = "Batch Image Optimizer | Next.js";
        
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        script.async = true;
        document.body.appendChild(script);
        
        return () => {
            // Check if the script is still in the body before trying to remove it
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Memoized handler for file selection (drag & drop or click)
    const handleFileChange = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files || e.dataTransfer.files);
        const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            setFiles(imageFiles);
            setOptimizedImages([]); // Clear previous results
        }
    }, []);

    // Drag and Drop event handlers
    const handleDragOver = useCallback((e) => e.preventDefault(), []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        handleFileChange(e);
    }, [handleFileChange]);

    // Core image optimization logic for a single file
    const optimizeImage = (file, qualityValue) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    const quality = qualityValue / 100;

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve({
                                originalName: file.name,
                                originalSize: file.size,
                                originalUrl: event.target.result,
                                optimizedUrl: URL.createObjectURL(blob),
                                optimizedSize: blob.size,
                                optimizedBlob: blob,
                            });
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    }, outputType, quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    // Handler to start the batch optimization process
    const handleOptimize = async () => {
        if (files.length === 0) return;
        setIsLoading(true);
        setOptimizedImages([]);

        const optimizationPromises = files.map(file => optimizeImage(file, quality));

        try {
            const results = await Promise.all(optimizationPromises);
            setOptimizedImages(results);
        } catch (error) {
            console.error("An error occurred during optimization:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handler to download all optimized images as a ZIP file
    const handleDownloadAll = async () => {
        if (optimizedImages.length === 0 || typeof window.JSZip === 'undefined') {
            console.error("JSZip library not loaded yet or no images to download.");
            return;
        }
        setIsZipping(true);
        try {
            const zip = new window.JSZip();
            optimizedImages.forEach(image => {
                const originalName = image.originalName.substring(0, image.originalName.lastIndexOf('.'));
                const extension = image.optimizedBlob.type.split('/')[1];
                zip.file(`${originalName}-optimized.${extension}`, image.optimizedBlob);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'optimized-images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error creating ZIP file:", error);
        } finally {
            setIsZipping(false);
        }
    };


    return (
        <main className="bg-slate-100 flex items-center justify-center min-h-screen p-4 font-sans">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-lg p-6 md:p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">Batch Image Optimizer 🚀</h1>
                    <p className="text-slate-500 mt-2">Unggah beberapa gambar sekaligus untuk optimasi cepat.</p>
                </div>

                {/* Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer bg-slate-50 hover:bg-slate-200 transition-colors"
                    onClick={() => document.getElementById('fileInput')?.click()}
                >
                    <input
                        type="file"
                        id="fileInput"
                        className="hidden"
                        accept="image/jpeg, image/png, image/webp"
                        multiple
                        onChange={handleFileChange}
                    />
                    <p className="text-slate-600 font-medium text-lg">Seret & Lepas gambar di sini</p>
                    <p className="text-slate-500 text-sm mt-1">atau klik untuk memilih file</p>
                    {files.length > 0 && (
                        <p className="text-blue-600 font-semibold mt-3 text-sm">{files.length} file dipilih</p>
                    )}
                </div>

                {/* Settings and Action Button */}
                {files.length > 0 && (
                    <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="w-full md:w-1/2">
                            <label htmlFor="quality" className="block text-sm font-medium text-slate-700 mb-2">
                                Kualitas Kompresi: <span className="font-bold text-blue-600">{quality}</span>%
                            </label>
                            <input
                                type="range"
                                id="quality"
                                min="10"
                                max="100"
                                value={quality}
                                onChange={(e) => setQuality(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <button
                            onClick={handleOptimize}
                            disabled={isLoading}
                            className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? 'Memproses...' : `Optimalkan ${files.length} Gambar`}
                        </button>
                    </div>
                )}

                {/* Results Area */}
                {isLoading && (
                    <div className="text-center py-10">
                        <div className="inline-block border-4 border-slate-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
                        <p className="mt-4 text-slate-600">Mengoptimalkan gambar, mohon tunggu...</p>
                    </div>
                )}

                {optimizedImages.length > 0 && !isLoading && (
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-800">✨ Hasil Optimasi</h2>
                            <button
                                onClick={handleDownloadAll}
                                disabled={!isClient || isZipping}
                                className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isZipping ? 'Menyiapkan ZIP...' : 'Unduh Semua (ZIP)'}
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                            {optimizedImages.map((image, index) => (
                                <div key={index} className="bg-slate-50 p-4 rounded-lg grid md:grid-cols-2 gap-4 items-center">
                                    {/* Previews */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <img src={image.originalUrl} className="w-full h-auto rounded-md object-contain max-h-32" alt="Original" />
                                        <img src={image.optimizedUrl} className="w-full h-auto rounded-md object-contain max-h-32" alt="Optimized" />
                                    </div>
                                    {/* Details and Download */}
                                    <div>
                                        <p className="font-bold text-slate-800 truncate" title={image.originalName}>{image.originalName}</p>
                                        <p className="text-sm text-slate-500">
                                            {formatBytes(image.originalSize)} → <span className="font-semibold text-green-600">{formatBytes(image.optimizedSize)}</span>
                                        </p>
                                        <p className="text-sm font-bold text-green-700 mt-1">
                                            Pengurangan {((1 - image.optimizedSize / image.originalSize) * 100).toFixed(1)}%
                                        </p>
                                        <a
                                            href={image.optimizedUrl}
                                            download={`${image.originalName.substring(0, image.originalName.lastIndexOf('.'))}-optimized.${image.optimizedBlob.type.split('/')[1]}`}
                                            className="mt-3 inline-block bg-slate-200 text-slate-800 text-sm font-semibold py-1 px-4 rounded-full hover:bg-slate-300 transition"
                                        >
                                            Unduh
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
