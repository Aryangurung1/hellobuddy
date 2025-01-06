// "use client";

// import { useState, useEffect } from "react";
// import { trpc } from "@/app/_trpc/client"; // Assuming you have a trpc hook for making queries
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import Skeleton from "react-loading-skeleton";
// import { Search } from "lucide-react";
// import { CustomInput } from "./custom-input";

// // Extended User type based on the structure returned from `getAllUsers`
// interface User {
//   id: string;
//   name: string;
//   email: string;
//   isAdmin: boolean;
//   stripeCustomerId: string | null;
//   stripeSubscriptionId: string | null;
//   stripePriceId: string | null;
//   stripeCurrentPeriodEnd: string | null;
//   isSuspend: boolean;
// }

// export default function UserTable() {
//   const {
//     data: users,
//     isLoading,
//     isError,
//     refetch,
//   } = trpc.getAllUsers.useQuery();
//   const [editingUser, setEditingUser] = useState<User | null>(null);
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
//   const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
//   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<User | null>(null);
//   const [newName, setNewName] = useState("");
//   const [isSaving, setIsSaving] = useState(false);
//   const { mutateAsync: suspendUserMutation } = trpc.suspendUser.useMutation();
//   const { mutateAsync: unsuspendUserMutation } =
//     trpc.unSuspendUser.useMutation();
//   const { mutateAsync: deleteUser } = trpc.deleteUser.useMutation();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

//   const getUserType = (user: User) => {
//     // If the user has a subscription and it's still active, mark them as "Subscribed"
//     if (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd) {
//       const currentPeriodEnd = new Date(user.stripeCurrentPeriodEnd);
//       if (currentPeriodEnd > new Date()) {
//         return "Subscribed";
//       }
//     }
//     return "Normal"; // If no active subscription, return "Normal"
//   };

//   useEffect(() => {
//     if (users) {
//       const filtered = users.filter(
//         (user) =>
//           user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           (user.isSuspend ? "suspended" : "active").includes(
//             searchTerm.toLowerCase()
//           ) ||
//           getUserType(user).toLowerCase().includes(searchTerm.toLowerCase())
//       );
//       setFilteredUsers(filtered);
//     }
//   }, [searchTerm, users]);

//   const handleEdit = (user: User) => {
//     setEditingUser(user);
//     setNewName(user.name);
//     setIsEditDialogOpen(true);
//   };

//   const handleSuspend = (user: User) => {
//     setSelectedUser(user);
//     setIsSuspendDialogOpen(true);
//   };

//   const handleDelete = (user: User) => {
//     setSelectedUser(user);
//     setIsDeleteDialogOpen(true);
//   };

//   const { mutateAsync: editUserMutation } = trpc.editUser.useMutation();

//   const confirmEdit = async () => {
//     if (editingUser) {
//       try {
//         setIsSaving(true); // Set loading state for mutation

//         // Call the mutation to update the name in Kinde
//         const updatedUser = await editUserMutation({
//           id: editingUser.id,
//           name: newName,
//         });

//         // After successful update, close the dialog
//         setIsEditDialogOpen(false);

//         // Update the UI optimistically without reloading the page
//         // This assumes the response from the mutation contains the updated user data
//         refetch(); // Re-fetch to ensure consistency, or update state directly
//       } catch (error) {
//         console.error("Failed to update user:", error);
//       } finally {
//         setIsSaving(false); // Reset loading state
//       }
//     }
//   };

//   const confirmSuspend = async () => {
//     if (selectedUser) {
//       // Suspend or activate the user
//       try {
//         setIsSaving(true);
//         if (selectedUser.isSuspend) {
//           await unsuspendUserMutation({ id: selectedUser.id });
//         } else {
//           await suspendUserMutation({ id: selectedUser.id });
//         }
//         setIsSuspendDialogOpen(false);
//         refetch(); // Refetch the data to get the updated status
//       } catch (error) {
//         console.error("Error suspending user:", error);
//       } finally {
//         setIsSaving(false); // Reset loading state
//       }
//     }
//   };

//   const confirmDelete = async () => {
//     if (selectedUser) {
//       try {
//         setIsSaving(true); // Set loading state for mutation

//         // Call the mutation to update the name in Kinde
//         const deletedUser = await deleteUser({
//           id: selectedUser.id,
//         });

//         // After successful update, close the dialog
//         setIsDeleteDialogOpen(false);

//         // Update the UI optimistically without reloading the page
//         // This assumes the response from the mutation contains the updated user data
//         refetch(); // Re-fetch to ensure consistency, or update state directly
//       } catch (error) {
//         console.error("Failed to Delete user:", error);
//       } finally {
//         setIsSaving(false); // Reset loading state
//       }
//     }
//   };

//   if (isLoading) {
//     return <Skeleton height={100} className="my-2" count={3} />;
//   }

//   if (isError) {
//     return <div>Error loading users.</div>;
//   }

//   return (
//     <div className="space-y-4">
//       <h1 className="text-2xl font-bold">User Management</h1>
//       <div className="flex items-center space-x-2 mb-4">
//         <div className="relative w-64">
//           <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//           <CustomInput
//             type="text"
//             placeholder="Search users..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="pl-8 pr-4 py-2 w-full text-sm"
//           />
//         </div>
//       </div>
//       <div className="border rounded-lg bg-white">
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead>Name</TableHead>
//               <TableHead>Email</TableHead>
//               <TableHead>Status</TableHead>
//               <TableHead>Type</TableHead>
//               <TableHead>Actions</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {filteredUsers?.map((user) => (
//               <TableRow key={user.id}>
//                 <TableCell>{user.name}</TableCell>
//                 <TableCell>{user.email}</TableCell>
//                 <TableCell>
//                   <span
//                     className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                       user.isSuspend
//                         ? "bg-red-100 text-red-800"
//                         : "bg-green-100 text-green-800"
//                     }`}
//                   >
//                     {user.isSuspend ? "Suspended" : "Active"}
//                   </span>
//                 </TableCell>
//                 <TableCell>
//                   <span
//                     className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                       user.isAdmin
//                         ? "bg-blue-100 text-blue-800"
//                         : "bg-gray-100 text-gray-800"
//                     }`}
//                   >
//                     {getUserType(user)}{" "}
//                     {/* Show either "Subscribed" or "Normal" */}
//                   </span>
//                 </TableCell>
//                 <TableCell>
//                   <div className="flex gap-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handleEdit(user)}
//                     >
//                       Edit
//                     </Button>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handleSuspend(user)}
//                     >
//                       {user.isSuspend ? "Activate" : "Suspend"}
//                     </Button>
//                     <Button
//                       variant="destructive"
//                       size="sm"
//                       onClick={() => handleDelete(user)}
//                     >
//                       Delete
//                     </Button>
//                   </div>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </div>

//       {/* Edit Dialog */}
//       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit User</DialogTitle>
//             <DialogDescription>
//               Make changes to the user's information here.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="name">Name</Label>
//               <Input
//                 id="name"
//                 value={newName}
//                 onChange={(e) => setNewName(e.target.value)}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsEditDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={confirmEdit}
//               disabled={isSaving} // Disable the button when saving
//             >
//               {isSaving ? (
//                 <div className="spinner"></div> // Show the spinner
//               ) : (
//                 "Save changes"
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Suspend Dialog */}
//       <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Action</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to{" "}
//               {selectedUser?.isSuspend ? "activate" : "suspend"} this user?
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsSuspendDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               variant={selectedUser?.isSuspend ? "default" : "destructive"}
//               onClick={confirmSuspend}
//             >
//               {isSaving ? (
//                 <div className="spinner"></div> // Show the spinner
//               ) : (
//                 `${selectedUser?.isSuspend ? "Activate" : "Suspend"} User`
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Delete Dialog */}
//       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Deletion</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to delete this user? This action cannot be
//               undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsDeleteDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button variant="destructive" onClick={confirmDelete}>
//               {isSaving ? (
//                 <div className="spinner"></div> // Show the spinner
//               ) : (
//                 "Delete User"
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import { trpc } from "@/app/_trpc/client";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import Skeleton from "react-loading-skeleton";
// import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
// import { CustomInput } from "./custom-input";
// import { Checkbox } from "@/components/ui/checkbox";

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   isAdmin: boolean;
//   stripeCustomerId: string | null;
//   stripeSubscriptionId: string | null;
//   stripePriceId: string | null;
//   stripeCurrentPeriodEnd: string | null;
//   isSuspend: boolean;
// }

// const USERS_PER_PAGE = 10;

// export default function UserTable() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [isLoadingPage, setIsLoadingPage] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");

//   const {
//     data: paginatedUsers,
//     isLoading,
//     isError,
//     refetch,
//   } = trpc.getPaginatedUsers.useQuery({
//     page: currentPage,
//     limit: USERS_PER_PAGE,
//     searchTerm: searchTerm,
//   });

//   const [editingUser, setEditingUser] = useState<User | null>(null);
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
//   const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
//   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<User | null>(null);
//   const [newName, setNewName] = useState("");
//   const [isSaving, setIsSaving] = useState(false);
//   const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
//   const [selectAll, setSelectAll] = useState(false);
//   const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
//   const [bulkAction, setBulkAction] = useState<
//     "activate" | "suspend" | "delete" | null
//   >(null);

//   const { mutateAsync: suspendUserMutation } = trpc.suspendUser.useMutation();
//   const { mutateAsync: unsuspendUserMutation } =
//     trpc.unSuspendUser.useMutation();
//   const { mutateAsync: deleteUser } = trpc.deleteUser.useMutation();
//   const { mutateAsync: editUserMutation } = trpc.editUser.useMutation();

//   const getUserType = (user: User) => {
//     if (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd) {
//       const currentPeriodEnd = new Date(user.stripeCurrentPeriodEnd);
//       if (currentPeriodEnd > new Date()) {
//         return "Subscribed";
//       }
//     }
//     return "Normal";
//   };

//   useEffect(() => {
//     if (paginatedUsers) {
//       setTotalPages(Math.ceil(paginatedUsers.total / USERS_PER_PAGE));
//     }
//   }, [paginatedUsers]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm]);

//   useEffect(() => {
//     if (selectAll) {
//       setSelectedUsers(paginatedUsers?.users.map((user) => user.id) || []);
//     } else {
//       setSelectedUsers([]);
//     }
//   }, [selectAll, paginatedUsers]);

//   const handlePageChange = async (newPage: number) => {
//     setIsLoadingPage(true);
//     setCurrentPage(newPage);
//     await refetch();
//     setIsLoadingPage(false);
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(e.target.value);
//   };

//   const handleEdit = (user: User) => {
//     setEditingUser(user);
//     setNewName(user.name);
//     setIsEditDialogOpen(true);
//   };

//   const handleSuspend = (user: User) => {
//     setSelectedUser(user);
//     setIsSuspendDialogOpen(true);
//   };

//   const handleDelete = (user: User) => {
//     setSelectedUser(user);
//     setIsDeleteDialogOpen(true);
//   };

//   const confirmEdit = async () => {
//     if (editingUser) {
//       try {
//         setIsSaving(true);
//         await editUserMutation({
//           id: editingUser.id,
//           name: newName,
//         });
//         setIsEditDialogOpen(false);
//         refetch();
//       } catch (error) {
//         console.error("Failed to update user:", error);
//       } finally {
//         setIsSaving(false);
//       }
//     }
//   };

//   const confirmSuspend = async () => {
//     if (selectedUser) {
//       try {
//         setIsSaving(true);
//         if (selectedUser.isSuspend) {
//           await unsuspendUserMutation({ id: selectedUser.id });
//         } else {
//           await suspendUserMutation({ id: selectedUser.id });
//         }
//         setIsSuspendDialogOpen(false);
//         refetch();
//       } catch (error) {
//         console.error("Error suspending user:", error);
//       } finally {
//         setIsSaving(false);
//       }
//     }
//   };

//   const confirmDelete = async () => {
//     if (selectedUser) {
//       try {
//         setIsSaving(true);
//         await deleteUser({
//           id: selectedUser.id,
//         });
//         setIsDeleteDialogOpen(false);
//         refetch();
//       } catch (error) {
//         console.error("Failed to Delete user:", error);
//       } finally {
//         setIsSaving(false);
//       }
//     }
//   };

//   const handleBulkAction = (action: "activate" | "suspend" | "delete") => {
//     setBulkAction(action);
//     setIsBulkActionDialogOpen(true);
//   };

//   const confirmBulkAction = async () => {
//     setIsSaving(true);
//     try {
//       switch (bulkAction) {
//         case "activate":
//           await Promise.all(
//             selectedUsers.map((id) => unsuspendUserMutation({ id }))
//           );
//           break;
//         case "suspend":
//           await Promise.all(
//             selectedUsers.map((id) => suspendUserMutation({ id }))
//           );
//           break;
//         case "delete":
//           await Promise.all(selectedUsers.map((id) => deleteUser({ id })));
//           break;
//       }
//       setIsBulkActionDialogOpen(false);
//       setSelectedUsers([]);
//       setSelectAll(false);
//       refetch();
//     } catch (error) {
//       console.error(`Failed to perform bulk ${bulkAction} action:`, error);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   if (isLoading) {
//     return <Skeleton height={100} className="my-2" count={3} />;
//   }

//   if (isError) {
//     return <div>Error loading users.</div>;
//   }

//   return (
//     <div className="space-y-4">
//       <h1 className="text-2xl font-bold">User Management</h1>
//       <div className="flex justify-between items-center mb-4">
//         <div className="relative w-64">
//           <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//           <CustomInput
//             type="text"
//             placeholder="Search by name, email, or status..."
//             value={searchTerm}
//             onChange={handleSearch}
//             className="pl-8 pr-4 py-2 w-full text-sm"
//           />
//         </div>
//         <div className="space-x-2">
//           <Button
//             onClick={() => handleBulkAction("activate")}
//             disabled={selectedUsers.length === 0}
//           >
//             Activate All
//           </Button>
//           <Button
//             onClick={() => handleBulkAction("suspend")}
//             disabled={selectedUsers.length === 0}
//           >
//             Suspend All
//           </Button>
//           <Button
//             onClick={() => handleBulkAction("delete")}
//             variant="destructive"
//             disabled={selectedUsers.length === 0}
//           >
//             Delete All
//           </Button>
//         </div>
//       </div>
//       <div className="border rounded-lg bg-white">
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px]">
//                 <Checkbox
//                   checked={selectAll}
//                   onCheckedChange={(checked) =>
//                     setSelectAll(checked as boolean)
//                   }
//                 />
//               </TableHead>
//               <TableHead className="w-[50px]">#</TableHead>
//               <TableHead>Name</TableHead>
//               <TableHead>Email</TableHead>
//               <TableHead>Status</TableHead>
//               <TableHead>Type</TableHead>
//               <TableHead>Actions</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {isLoadingPage ? (
//               <TableRow>
//                 <TableCell colSpan={7} className="h-24 text-center">
//                   <Loader2 className="w-6 h-6 animate-spin mx-auto" />
//                 </TableCell>
//               </TableRow>
//             ) : (
//               paginatedUsers?.users.map((user, index) => (
//                 <TableRow key={user.id}>
//                   <TableCell>
//                     <Checkbox
//                       checked={selectedUsers.includes(user.id)}
//                       onCheckedChange={(checked) => {
//                         if (checked) {
//                           setSelectedUsers([...selectedUsers, user.id]);
//                         } else {
//                           setSelectedUsers(
//                             selectedUsers.filter((id) => id !== user.id)
//                           );
//                         }
//                       }}
//                     />
//                   </TableCell>
//                   <TableCell>
//                     {(currentPage - 1) * USERS_PER_PAGE + index + 1}
//                   </TableCell>
//                   <TableCell>{user.name}</TableCell>
//                   <TableCell>{user.email}</TableCell>
//                   <TableCell>
//                     <span
//                       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                         user.isSuspend
//                           ? "bg-red-100 text-red-800"
//                           : "bg-green-100 text-green-800"
//                       }`}
//                     >
//                       {user.isSuspend ? "Suspended" : "Active"}
//                     </span>
//                   </TableCell>
//                   <TableCell>
//                     <span
//                       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                         user.isAdmin
//                           ? "bg-blue-100 text-blue-800"
//                           : "bg-gray-100 text-gray-800"
//                       }`}
//                     >
//                       {getUserType(user)}
//                     </span>
//                   </TableCell>
//                   <TableCell>
//                     <div className="flex gap-2">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handleEdit(user)}
//                       >
//                         Edit
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => handleSuspend(user)}
//                       >
//                         {user.isSuspend ? "Activate" : "Suspend"}
//                       </Button>
//                       <Button
//                         variant="destructive"
//                         size="sm"
//                         onClick={() => handleDelete(user)}
//                       >
//                         Delete
//                       </Button>
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               ))
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       {/* Pagination */}
//       <div className="flex items-center justify-between">
//         <div>
//           Showing {(currentPage - 1) * USERS_PER_PAGE + 1} to{" "}
//           {Math.min(currentPage * USERS_PER_PAGE, paginatedUsers?.total || 0)}{" "}
//           of {paginatedUsers?.total || 0} users
//         </div>
//         <div className="flex gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => handlePageChange(currentPage - 1)}
//             disabled={currentPage === 1 || isLoadingPage}
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </Button>
//           {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//             <Button
//               key={page}
//               variant={page === currentPage ? "default" : "outline"}
//               size="sm"
//               onClick={() => handlePageChange(page)}
//               disabled={isLoadingPage}
//             >
//               {page}
//             </Button>
//           ))}
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => handlePageChange(currentPage + 1)}
//             disabled={currentPage === totalPages || isLoadingPage}
//           >
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>

//       {/* Edit Dialog */}
//       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit User</DialogTitle>
//             <DialogDescription>
//               Make changes to the user's information here.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="name">Name</Label>
//               <Input
//                 id="name"
//                 value={newName}
//                 onChange={(e) => setNewName(e.target.value)}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsEditDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button onClick={confirmEdit} disabled={isSaving}>
//               {isSaving ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : null}
//               Save changes
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Suspend Dialog */}
//       <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Action</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to{" "}
//               {selectedUser?.isSuspend ? "activate" : "suspend"} this user?
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsSuspendDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               variant={selectedUser?.isSuspend ? "default" : "destructive"}
//               onClick={confirmSuspend}
//               disabled={isSaving}
//             >
//               {isSaving ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : null}
//               {selectedUser?.isSuspend ? "Activate" : "Suspend"} User
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Delete Dialog */}
//       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Deletion</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to delete this user? This action cannot be
//               undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsDeleteDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               onClick={confirmDelete}
//               disabled={isSaving}
//             >
//               {isSaving ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : null}
//               Delete User
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Bulk Action Dialog */}
//       <Dialog
//         open={isBulkActionDialogOpen}
//         onOpenChange={setIsBulkActionDialogOpen}
//       >
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Bulk Action</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to {bulkAction} the selected users? This
//               action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsBulkActionDialogOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               variant={bulkAction === "delete" ? "destructive" : "default"}
//               onClick={confirmBulkAction}
//               disabled={isSaving}
//             >
//               {isSaving ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : null}
//               Confirm {bulkAction}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/app/_trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Skeleton from "react-loading-skeleton";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomInput } from "./custom-input";
import { Checkbox } from "@/components/ui/checkbox";
import debounce from "lodash/debounce";
import { PDFManager } from "./pdf-manager";

interface User {
  id: string;
  name: string;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: string | null;
  isSuspend: boolean;
}

const USERS_PER_PAGE = 5;

export default function UserTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const {
    data: paginatedUsers,
    isLoading,
    isError,
    refetch,
  } = trpc.getPaginatedUsers.useQuery({
    page: currentPage,
    limit: USERS_PER_PAGE,
    searchTerm: debouncedSearchTerm,
  });

  const [isPending, setIsPending] = useState<boolean>(true);
  console.log(isPending);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<
    "activate" | "suspend" | "delete" | null
  >(null);

  const { mutateAsync: suspendUserMutation } = trpc.suspendUser.useMutation();
  const { mutateAsync: unsuspendUserMutation } =
    trpc.unSuspendUser.useMutation();
  const { mutateAsync: deleteUser } = trpc.deleteUser.useMutation();
  const { mutateAsync: editUserMutation } = trpc.editUser.useMutation();

  const getUserType = (user: User) => {
    if (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd) {
      const currentPeriodEnd = new Date(user.stripeCurrentPeriodEnd);
      if (currentPeriodEnd > new Date()) {
        return "Subscribed";
      }
    }
    return "Normal";
  };

  useEffect(() => {
    if (paginatedUsers) {
      setTotalPages(Math.ceil(paginatedUsers.total / USERS_PER_PAGE));
    }
  }, [paginatedUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (selectAll) {
      setSelectedUsers(paginatedUsers?.users.map((user) => user.id) || []);
    } else {
      setSelectedUsers([]);
    }
  }, [selectAll, paginatedUsers]);

  // Debounce search term
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setNewName(user.name);
    setIsEditDialogOpen(true);
  };

  const handleSuspend = (user: User) => {
    setSelectedUser(user);
    setIsSuspendDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmEdit = async () => {
    if (editingUser) {
      try {
        setIsSaving(true);
        await editUserMutation({
          id: editingUser.id,
          name: newName,
        });
        setIsEditDialogOpen(false);
        refetch();
      } catch (error) {
        console.error("Failed to update user:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const confirmSuspend = async () => {
    if (selectedUser) {
      try {
        setIsSaving(true);
        if (selectedUser.isSuspend) {
          await unsuspendUserMutation({ id: selectedUser.id });
        } else {
          await suspendUserMutation({ id: selectedUser.id });
        }
        setIsSuspendDialogOpen(false);
        refetch();
      } catch (error) {
        console.error("Error suspending user:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedUser) {
      try {
        setIsSaving(true);
        await deleteUser({
          id: selectedUser.id,
        });
        setIsDeleteDialogOpen(false);
        refetch();
      } catch (error) {
        console.error("Failed to Delete user:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBulkAction = (action: "activate" | "suspend" | "delete") => {
    setBulkAction(action);
    setIsBulkActionDialogOpen(true);
  };

  const confirmBulkAction = async () => {
    setIsSaving(true);
    try {
      switch (bulkAction) {
        case "activate":
          await Promise.all(
            selectedUsers.map((id) => unsuspendUserMutation({ id }))
          );
          break;
        case "suspend":
          await Promise.all(
            selectedUsers.map((id) => suspendUserMutation({ id }))
          );
          break;
        case "delete":
          await Promise.all(selectedUsers.map((id) => deleteUser({ id })));
          break;
      }
      setIsBulkActionDialogOpen(false);
      setSelectedUsers([]);
      setSelectAll(false);
      refetch();
    } catch (error) {
      console.error(`Failed to perform bulk ${bulkAction} action:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isError) {
    return <div>Error loading users.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <CustomInput
            type="text"
            placeholder="Search by name, email, or status..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 pr-4 py-2 w-full text-sm"
          />
        </div>
        <div className="space-x-2">
          <Button
            onClick={() => handleBulkAction("activate")}
            disabled={selectedUsers.length === 0}
          >
            Activate All
          </Button>
          <Button
            onClick={() => handleBulkAction("suspend")}
            disabled={selectedUsers.length === 0}
          >
            Suspend All
          </Button>
          <Button
            onClick={() => handleBulkAction("delete")}
            variant="destructive"
            disabled={selectedUsers.length === 0}
          >
            Delete All
          </Button>
        </div>
      </div>
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) =>
                    setSelectAll(checked as boolean)
                  }
                />
              </TableHead>
              <TableHead className="w-[50px]">Id</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers?.users.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(
                            selectedUsers.filter((id) => id !== user.id)
                          );
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {(currentPage - 1) * USERS_PER_PAGE + index + 1}
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isSuspend
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.isSuspend ? "Suspended" : "Active"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}
                    >
                      {getUserType(user)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuspend(user)}
                      >
                        {user.isSuspend ? "Activate" : "Suspend"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </Button>
                      <PDFManager
                        userId={user.id}
                        isPending={isLoading}
                        setIsPending={setIsPending}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div>
          Showing {(currentPage - 1) * USERS_PER_PAGE + 1} to{" "}
          {Math.min(currentPage * USERS_PER_PAGE, paginatedUsers?.total || 0)}{" "}
          of {paginatedUsers?.total || 0} users
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || isLoading}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNumber = currentPage + i - Math.min(2, currentPage - 1);
            return pageNumber > 0 && pageNumber <= totalPages ? (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNumber)}
                disabled={isLoading}
              >
                {pageNumber}
              </Button>
            ) : null;
          }).filter(Boolean)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || isLoading}
          >
            Last
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user's information here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {selectedUser?.isSuspend ? "activate" : "suspend"} this user?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSuspendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isSuspend ? "default" : "destructive"}
              onClick={confirmSuspend}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {selectedUser?.isSuspend ? "Activate" : "Suspend"} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog
        open={isBulkActionDialogOpen}
        onOpenChange={setIsBulkActionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {bulkAction} the selected users? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkActionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={bulkAction === "delete" ? "destructive" : "default"}
              onClick={confirmBulkAction}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm {bulkAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
