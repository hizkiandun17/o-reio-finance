"use client";

import Image from "next/image";
import { Download, ExternalLink, FileText, ImageIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TransactionProof } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TransactionProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proof: TransactionProof | null;
  title?: string;
  description?: string;
}

export function TransactionProofDialog({
  open,
  onOpenChange,
  proof,
  title = "Transaction proof",
  description = "Review the uploaded proof file for this transaction.",
}: TransactionProofDialogProps) {
  const isImage = proof?.mimeType.startsWith("image/") ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#151515] text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {proof ? (
          <>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 border border-white/8 bg-[#121212] px-4 py-3">
                {isImage ? (
                  <ImageIcon className="size-4 text-[#d6d6d6]" />
                ) : (
                  <FileText className="size-4 text-[#d6d6d6]" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{proof.name}</p>
                  <p className="mt-1 text-sm text-[#8f8f8f]">
                    {proof.mimeType === "application/pdf" ? "PDF document" : "Image proof"}
                  </p>
                </div>
              </div>

              {isImage ? (
                <div className="overflow-hidden border border-white/8 bg-[#101010]">
                  <Image
                    src={proof.dataUrl}
                    alt={proof.name}
                    width={1440}
                    height={960}
                    unoptimized
                    className="max-h-[65vh] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="overflow-hidden border border-white/8 bg-[#101010]">
                  <iframe
                    src={proof.dataUrl}
                    title={proof.name}
                    className="h-[65vh] w-full"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="border-white/10 bg-[#121212]">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <a
                  href={proof.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-none border-white/10 bg-transparent text-white hover:bg-white/6",
                  )}
                >
                  <ExternalLink className="size-4" />
                  Open
                </a>
                <a
                  href={proof.dataUrl}
                  download={proof.name}
                  className={cn(
                    buttonVariants({}),
                    "rounded-none border border-white bg-white text-black hover:bg-white/90",
                  )}
                >
                  <Download className="size-4" />
                  Download
                </a>
              </div>
            </DialogFooter>
          </>
        ) : (
          <DialogFooter className="border-white/10 bg-[#121212]">
            <Button
              variant="outline"
              className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/6"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
