"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Alert, AlertDescription } from "../ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Textarea } from "../ui/textarea"
import { Loader2, User, Lock, Info } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"

export default function ProfileManager() {
  const {
    user,
    profile,
    isProfileLoading,
    updateProfile,
    changePassword,
    isUpdatingProfile,
    isChangingPassword,
    updateProfileError,
    changePasswordError,
    resetUpdateProfileError,
    resetChangePasswordError
  } = useAuth()

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    specialty: profile?.doctor?.specialty ?? "",
    about: profile?.doctor?.about ?? "",
    experience: profile?.doctor?.experience ?? 0,
    address: profile?.patient?.address ?? "",
    gender: profile?.patient?.gender ?? "",
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [passwordError, setPasswordError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage("")
    resetUpdateProfileError()

    try {
      const updateData: {
        name?: string;
        phone?: string;
        specialty?: string;
        about?: string;
        experience?: number;
        address?: string;
        gender?: string;
      } = {
        name: profileForm.name,
        phone: profileForm.phone,
      }

      // Add role-specific fields
      if (user?.role === "DOCTOR") {
        updateData.specialty = profileForm.specialty
        updateData.about = profileForm.about
        updateData.experience = profileForm.experience
      } else if (user?.role === "PATIENT") {
        updateData.address = profileForm.address
        updateData.gender = profileForm.gender
      }

      const result = await updateProfile(updateData)
      if (result.status === 200) {
        setSuccessMessage("Perfil actualizado exitosamente")
      }
    } catch (error) {
      // Error is handled by the hook
    }
  }

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setSuccessMessage("")
    resetChangePasswordError()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      return
    }

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      if (result.status === 200) {
        setSuccessMessage("Contraseña actualizada exitosamente")
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      }
    } catch (error) {
      // Error is handled by the hook
    }
  }

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Gestión de Perfil</span>
          </CardTitle>
          <CardDescription>
            Administra tu información personal y configuración de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="security">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {updateProfileError && (
                  <Alert variant="destructive">
                    <AlertDescription>{updateProfileError.message}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      disabled={isUpdatingProfile}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={isUpdatingProfile}
                    />
                  </div>
                </div>

                {/* Doctor-specific fields */}
                {user?.role === "DOCTOR" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidad</Label>
                      <Input
                        id="specialty"
                        value={profileForm.specialty}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, specialty: e.target.value }))}
                        disabled={isUpdatingProfile}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="about">Acerca de mí</Label>
                      <Textarea
                        id="about"
                        value={profileForm.about}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, about: e.target.value }))}
                        disabled={isUpdatingProfile}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Años de experiencia</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        value={profileForm.experience}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, experience: parseInt(e.target.value) ?? 0 }))}
                        disabled={isUpdatingProfile}
                      />
                    </div>
                  </>
                )}

                {/* Patient-specific fields */}
                {user?.role === "PATIENT" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                        disabled={isUpdatingProfile}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Género</Label>
                      <select
                        id="gender"
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                        disabled={isUpdatingProfile}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Seleccionar género</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Femenino</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>
                  </>
                )}

                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Actualizar Perfil
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {(changePasswordError ?? passwordError) && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {changePasswordError?.message ?? passwordError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    disabled={isChangingPassword}
                  />
                </div>

                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Lock className="mr-2 h-4 w-4" />
                  Cambiar Contraseña
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 