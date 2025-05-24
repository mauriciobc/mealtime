import { useState } from "react"
import { useRouter } from "next/navigation"
import { Household, HouseholdMember } from "@/lib/types"
import { useUserContext } from "@/lib/context/UserContext"
import { useHousehold } from "@/lib/context/HouseholdContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, ShieldCheck, ShieldX, UserMinus, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface HouseholdMembersProps {
  household: Household
}

export function HouseholdMembers({ household }: HouseholdMembersProps) {
  const router = useRouter()
  const { state: userState } = useUserContext()
  const user = userState.currentUser
  const { state: householdState, dispatch: householdDispatch } = useHousehold()
  const [isLoading, setIsLoading] = useState(false)

  const isAdmin = household.members.some(member => 
    member.userId === user?.id && member.role === "Admin"
  )

  const handleRemoveMember = async (memberId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/households/${household.id}/members/${memberId}`, {
        method: "DELETE",
      })

      if (process.env.NODE_ENV === 'development') {
        console.log("[DEBUG] Response object:", response);
      }
      let updatedHousehold;
      try {
        updatedHousehold = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log("[DEBUG] Parsed JSON:", updatedHousehold);
        }
      } catch (jsonErr) {
        console.error("[DEBUG] Error parsing JSON:", jsonErr);
        throw jsonErr;
      }

      if (!response.ok) {
        let errorMessage = "Failed to remove member"
        try {
          const errorData = updatedHousehold;
          if (errorData?.error) {
            if (Array.isArray(errorData.error)) {
              errorMessage = errorData.error.map((err: any) => err.message || JSON.stringify(err)).join(", ")
            } else if (typeof errorData.error === "object") {
              errorMessage = Object.values(errorData.error).join(", ")
            } else {
              errorMessage = errorData.error
            }
          }
        } catch {}
        throw new Error(errorMessage)
      }

      householdDispatch({ type: 'SET_HOUSEHOLD', payload: updatedHousehold })
      toast.success("Member removed successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove member")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: "Admin" | "Member") => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/households/${household.id}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        throw new Error("Failed to update member role")
      }

      const updatedHousehold = await response.json()
      householdDispatch({ type: 'SET_HOUSEHOLD', payload: updatedHousehold })
      toast.success("Member role updated successfully")
    } catch (error) {
      toast.error("Failed to update member role")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = () => {
    router.push(`/households/${household.id}/invite`)
  }

  if (!household.members.length) {
    return (
      <EmptyState
        IconComponent={UserPlus}
        title="No members yet"
        description="Invite members to your household to get started"
        actionButton={
          <Button onClick={handleInviteMember}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={handleInviteMember}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      )}
      
      {household.members.map((member) => (
        <Card key={member.userId}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <CardDescription>{member.email}</CardDescription>
                </div>
                <Badge variant={member.role === "Admin" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
              </div>

              {isAdmin && member.userId !== user?.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleUpdateRole(member.userId, member.role === "Admin" ? "Member" : "Admin")}
                    >
                      {member.role === "Admin" ? (
                        <>
                          <ShieldX className="w-4 h-4 mr-2" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Make Admin
                        </>
                      )}
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this member from the household? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isLoading}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 