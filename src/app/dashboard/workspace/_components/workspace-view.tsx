"use client";

import { useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api, type RouterOutputs } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { InviteDoctorDialog } from "./invite-doctor-dialog";
import { LocationDialog } from "./location-dialog";
import { BillingSettings } from "./billing-settings";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { MessagingSettings } from "./messaging-settings";

type Workspace = Exclude<RouterOutputs["workspace"]["getMine"]["result"], null>;
type WorkspaceMember = Exclude<
  RouterOutputs["workspace"]["members"]["list"]["result"],
  null
>[number];
type WorkspaceInvitation = Exclude<
  RouterOutputs["workspace"]["invitations"]["list"]["result"],
  null
>[number];
type InvitationResult = Exclude<
  RouterOutputs["workspace"]["invitations"]["create"]["result"],
  null
>;
type WorkspaceLocation = Exclude<
  RouterOutputs["workspace"]["locations"]["list"]["result"],
  null
>[number];

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function WorkspaceHeader({
  workspace,
  onInvite,
}: {
  workspace: Workspace;
  onInvite: () => void;
}) {
  const plan = workspace.subscription?.plan ?? "Sin plan";
  return (
    <div className="flex flex-col gap-4 border-b border-[#ebebeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#737373]">
          <Building2 className="h-3.5 w-3.5" />
          Workspace
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight text-[#171717]">
            {workspace.clinic.name}
          </h1>
          <Badge variant="outline" className="font-mono text-[10px]">
            {plan}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-[#737373]">
          {workspace.membershipRole.toLowerCase()} · {workspace.clinic.slug}
        </p>
      </div>
      <Button onClick={onInvite} className="shrink-0">
        <Plus className="mr-2 h-4 w-4" />
        Invitar doctor
      </Button>
    </div>
  );
}

function MembersTable({
  members,
  onRemove,
}: {
  members: WorkspaceMember[];
  onRemove: (member: WorkspaceMember) => void;
}) {
  if (members.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-[#737373]">
        Aún no hay miembros en este workspace.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Miembro</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-xs font-medium text-[#525252]">
                  {(member.user.name ?? member.user.email)
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#262626]">
                    {member.user.name ?? "Sin nombre"}
                  </p>
                  <p className="truncate text-xs text-[#737373]">
                    {member.user.email}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{member.role.toLowerCase()}</Badge>
            </TableCell>
            <TableCell>
              {member.role === "DOCTOR" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Más acciones"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Retirar doctor</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se quitará su acceso a este workspace, sin borrar sus
                        citas ni su historial.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => onRemove(member)}
                      >
                        Retirar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InvitationsList({
  invitations,
  onRevoke,
}: {
  invitations: WorkspaceInvitation[];
  onRevoke: (invitation: WorkspaceInvitation) => void;
}) {
  if (invitations.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-[#737373]">
        No hay invitaciones recientes.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#f0f0f0]">
      {invitations.slice(0, 8).map((invitation) => {
        const pending =
          !invitation.acceptedAt &&
          !invitation.revokedAt &&
          new Date(invitation.expiresAt) > new Date();
        return (
          <div
            key={invitation.id}
            className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-[#737373]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#262626]">
                  {invitation.email}
                </p>
                <p className="text-xs text-[#737373]">
                  Expira {formatDate(invitation.expiresAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {invitation.acceptedAt
                  ? "aceptada"
                  : invitation.revokedAt
                    ? "revocada"
                    : pending
                      ? "pendiente"
                      : "expirada"}
              </Badge>
              {pending && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(invitation)}
                >
                  Revocar
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LocationsList({
  locations,
  onEdit,
  onArchive,
}: {
  locations: WorkspaceLocation[];
  onEdit: (location: WorkspaceLocation) => void;
  onArchive: (location: WorkspaceLocation) => void;
}) {
  if (locations.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-[#737373]">
        Aún no hay ubicaciones activas.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#f0f0f0]">
      {locations.map((location) => (
        <div
          key={location.id}
          className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#737373]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#262626]">
                {location.name}
                {!location.isActive && (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    Archivada
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-[#737373]">
                {location.address ?? "Sin dirección"} ·{" "}
                {location.timezone ?? "Zona horaria de la clínica"}
              </p>
            </div>
          </div>
          <div
            className={
              location.isActive ? "flex shrink-0 items-center gap-1" : "hidden"
            }
          >
            <Button variant="ghost" size="sm" onClick={() => onEdit(location)}>
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#737373]">
                  Archivar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archivar ubicación</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ya no aparecerá como opción para nuevas citas. El historial
                    existente se conserva.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onArchive(location)}>
                    Archivar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceView() {
  const utils = api.useUtils();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<WorkspaceLocation | null>(null);
  const workspaceQuery = api.workspace.getMine.useQuery();
  const membersQuery = api.workspace.members.list.useQuery();
  const invitationsQuery = api.workspace.invitations.list.useQuery();
  const locationsQuery = api.workspace.locations.list.useQuery();
  const createInvitation = api.workspace.invitations.create.useMutation();
  const revokeInvitation = api.workspace.invitations.revoke.useMutation();
  const removeDoctor = api.workspace.members.removeDoctor.useMutation();
  const createLocation = api.workspace.locations.create.useMutation();
  const updateLocation = api.workspace.locations.update.useMutation();
  const archiveLocation = api.workspace.locations.archive.useMutation();

  const workspace = workspaceQuery.data?.result;

  const refresh = async () => {
    await Promise.all([
      utils.workspace.members.list.invalidate(),
      utils.workspace.invitations.list.invalidate(),
      utils.workspace.locations.list.invalidate(),
      utils.workspace.getMine.invalidate(),
    ]);
  };

  const handleLocationSubmit = async (draft: {
    id?: string;
    name: string;
    address: string;
    timezone: string;
  }) => {
    try {
      if (draft.id) {
        unwrapTrpcResult(
          await updateLocation.mutateAsync({
            locationId: draft.id,
            name: draft.name,
            address: draft.address || undefined,
            timezone: draft.timezone || undefined,
          }),
        );
        toast.success("Ubicación actualizada");
      } else {
        unwrapTrpcResult(
          await createLocation.mutateAsync({
            name: draft.name,
            address: draft.address || undefined,
            timezone: draft.timezone || undefined,
          }),
        );
        toast.success("Ubicación creada");
      }
      setLocationOpen(false);
      setEditingLocation(null);
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la ubicación",
      );
    }
  };

  const handleArchiveLocation = async (location: WorkspaceLocation) => {
    try {
      unwrapTrpcResult(
        await archiveLocation.mutateAsync({ locationId: location.id }),
      );
      await refresh();
      toast.success("Ubicación archivada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo archivar la ubicación",
      );
    }
  };

  const handleInvite = async (email: string, expiresInDays: number) => {
    try {
      const result = unwrapTrpcResult(
        await createInvitation.mutateAsync({ email, expiresInDays }),
      );
      const data = result as InvitationResult;
      setInviteToken(data.inviteToken);
      await refresh();
      toast.success("Invitación creada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo crear la invitación",
      );
    }
  };

  const handleRevoke = async (invitation: WorkspaceInvitation) => {
    try {
      unwrapTrpcResult(
        await revokeInvitation.mutateAsync({ invitationId: invitation.id }),
      );
      await refresh();
      toast.success("Invitación revocada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo revocar la invitación",
      );
    }
  };

  const handleRemove = async (member: WorkspaceMember) => {
    try {
      unwrapTrpcResult(await removeDoctor.mutateAsync({ memberId: member.id }));
      await refresh();
      toast.success("Doctor retirado del workspace");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo retirar al doctor",
      );
    }
  };

  if (workspaceQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (workspaceQuery.data?.error === "WORKSPACE_NOT_FOUND")
    return <CreateWorkspaceForm />;

  if (!workspace || workspaceQuery.isError || workspaceQuery.data?.error) {
    return (
      <div className="min-h-[100dvh] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div
          className="mx-auto max-w-5xl border-l-2 border-rose-500 bg-white px-4 py-3 text-sm text-[#525252]"
          role="alert"
        >
          No se pudo cargar el workspace.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <WorkspaceHeader
          workspace={workspace}
          onInvite={() => setInviteOpen(true)}
        />
        {workspace.membershipRole === "OWNER" && <BillingSettings />}
        {workspace.membershipRole === "OWNER" && <MessagingSettings />}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden rounded-lg border-[#ebebeb] bg-white shadow-none">
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#737373]" />
                <h2 className="text-sm font-semibold">Miembros</h2>
              </div>
              <span className="font-mono text-xs text-[#737373]">
                {membersQuery.data?.result?.length ?? 0}
              </span>
            </div>
            {membersQuery.isLoading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <MembersTable
                members={membersQuery.data?.result ?? []}
                onRemove={(member) => void handleRemove(member)}
              />
            )}
          </Card>

          <Card className="overflow-hidden rounded-lg border-[#ebebeb] bg-white shadow-none">
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#737373]" />
                <h2 className="text-sm font-semibold">Invitaciones</h2>
              </div>
              <span className="font-mono text-xs text-[#737373]">
                {invitationsQuery.data?.result?.length ?? 0}
              </span>
            </div>
            {invitationsQuery.isLoading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <InvitationsList
                invitations={invitationsQuery.data?.result ?? []}
                onRevoke={(invitation) => void handleRevoke(invitation)}
              />
            )}
          </Card>

          <Card className="overflow-hidden rounded-lg border-[#ebebeb] bg-white shadow-none">
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#737373]" />
                <h2 className="text-sm font-semibold">Ubicaciones</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingLocation(null);
                  setLocationOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Añadir
              </Button>
            </div>
            {locationsQuery.isLoading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <LocationsList
                locations={locationsQuery.data?.result ?? []}
                onEdit={(location) => {
                  setEditingLocation(location);
                  setLocationOpen(true);
                }}
                onArchive={(location) => void handleArchiveLocation(location)}
              />
            )}
          </Card>
        </div>
      </div>
      <InviteDoctorDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        isPending={createInvitation.isPending}
        inviteToken={inviteToken}
        onSubmit={handleInvite}
        onClearToken={() => setInviteToken(null)}
      />
      <LocationDialog
        open={locationOpen}
        onOpenChange={(open) => {
          setLocationOpen(open);
          if (!open) setEditingLocation(null);
        }}
        isPending={createLocation.isPending || updateLocation.isPending}
        location={
          editingLocation
            ? {
                id: editingLocation.id,
                name: editingLocation.name,
                address: editingLocation.address ?? "",
                timezone: editingLocation.timezone ?? "",
              }
            : null
        }
        onSubmit={handleLocationSubmit}
      />
    </div>
  );
}
