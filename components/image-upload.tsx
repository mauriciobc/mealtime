"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, X, Camera, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatErrorMessage, getFallbackImageUrl, isFallbackImage } from "@/lib/image-errors";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  type?: 'user' | 'cat' | 'thumbnail';
}

export function ImageUpload({ value, onChange, className, type = 'user' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value || getFallbackImageUrl(type));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manipula o clique no botão de upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Manipula a captura da imagem pela câmera ou seleção de arquivo
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Criar preview local
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      
      // Preparar o FormData para upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      
      // Fazer upload para o servidor
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        let errorMsg = `Falha ao enviar imagem (${response.status} ${response.statusText})`; // Default error with status
        try {
          // Check content type before assuming JSON
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } else {
             // Attempt to read as text if not JSON
            const textError = await response.text();
            console.error("Server returned non-JSON error:", textError);
             // You could try to parse HTML here if necessary, or just use the status text
          }
        } catch (parseOrReadError) {
          // Catch errors during .json() or .text()
          console.error("Failed to parse or read error response body:", parseOrReadError);
        }
        throw new Error(errorMsg);
      }
      
      // Success case: still need to handle potential non-JSON
      let data: { url?: string } = {}; // Define expected structure
      try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
              data = await response.json();
              if (!data.url) {
                  console.error("Upload successful, but response JSON is missing 'url'", data);
                  throw new Error("Resposta do servidor inválida após o upload.");
              }
          } else {
              const textResponse = await response.text();
              console.error("Server returned non-JSON success response:", textResponse);
              throw new Error("Resposta inesperada do servidor após o upload.");
          }
      } catch (parseOrReadError) {
           console.error("Failed to parse or read successful response body:", parseOrReadError);
           throw new Error("Falha ao processar a resposta do servidor após o upload.");
      }
      
      // Atualizar o valor com a URL retornada
      // Ensure data.url exists before using it (handled by check above)
      onChange(data.url!);
      
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = "";
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      // Em caso de erro, usar imagem de fallback
      setPreview(getFallbackImageUrl(type));
      // Exibir mensagem de erro formatada para o usuário
      toast.error(formatErrorMessage(error as Error));
    } finally {
      setIsUploading(false);
    }
  };
  
  // Remove a imagem atual
  const handleRemove = () => {
    const fallbackUrl = getFallbackImageUrl(type);
    setPreview(fallbackUrl);
    onChange(fallbackUrl);
  };
  
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {preview ? (
        <div className="relative aspect-square w-32 h-32 rounded-md overflow-hidden border">
          <Image
            src={preview}
            alt="Preview"
            fill
            className={cn(
              "object-cover",
              isFallbackImage(preview) && "opacity-50"
            )}
          />
          {!isFallbackImage(preview) && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="w-32 h-32 rounded-md border border-dashed flex flex-col items-center justify-center gap-1 bg-muted/30">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Nenhuma imagem</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4" />
          Câmera
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => {
            // Desativa captura da câmera para permitir escolher da galeria
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
              // Restaura o atributo capture após o clique
              setTimeout(() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }, 1000);
            }
          }}
          disabled={isUploading}
        >
          <ImageIcon className="h-4 w-4" />
          Galeria
        </Button>
      </div>
      
      {isUploading && <p className="text-sm text-muted-foreground">Enviando...</p>}
    </div>
  );
} 