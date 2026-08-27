import React from "react";
import { AddPlaceModal } from "./Modals";

interface EditShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: any;
  onShopUpdated?: () => void;
  onShopDeleted?: (id: string | number) => void;
}

export function EditShopModal({
  isOpen,
  shop,
  onClose,
  onShopUpdated,
}: EditShopModalProps) {
  return (
    <AddPlaceModal
      isOpen={isOpen}
      onClose={onClose}
      initialData={shop}
      onSuccess={onShopUpdated}
      onSubmissionUpdated={onShopUpdated}
    />
  );
}
