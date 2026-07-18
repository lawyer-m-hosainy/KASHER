import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppUser, Shop } from '../types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  shop: Shop | null;
  loading: boolean;
  currentBranchId: string | null;
  setCurrentBranchId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  shop: null,
  loading: true,
  currentBranchId: null,
  setCurrentBranchId: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch app user profile
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            setAppUser(userData);

            if (userData.isAdmin) {
               setShop({
                 shopId: 'ADMIN',
                 name: 'Platform Admin',
                 ownerName: 'Admin',
                 phone: '',
                 subscriptionStatus: 'active',
                 createdAt: Date.now()
               });
               setCurrentBranchId(null);
               setLoading(false);
               return;
            }

            // Fetch shop details
            const shopDoc = await getDoc(doc(db, 'shops', userData.shopId));
            if (shopDoc.exists()) {
              const shopData = shopDoc.data() as Shop;
              
              if (shopData.subscriptionExpiryDate && shopData.subscriptionExpiryDate < Date.now() && shopData.subscriptionStatus === 'active') {
                shopData.subscriptionStatus = 'expired';
                try {
                  await updateDoc(doc(db, 'shops', userData.shopId), { subscriptionStatus: 'expired' });
                } catch(e) {
                  console.error("Failed to update expired status", e);
                }
              }

              setShop(shopData);
              
              if (userData.role === 'cashier') {
                setCurrentBranchId(userData.branchId || null);
              } else {
                setCurrentBranchId(shopData.branches && shopData.branches.length > 0 ? shopData.branches[0].id : null);
              }
            } else {
              setShop(null);
              setCurrentBranchId(null);
            }
          } else {
            setAppUser(null);
            setShop(null);
            setCurrentBranchId(null);
          }
        } catch (error) {
          console.error("Error fetching user/shop data:", error);
        }
      } else {
        setAppUser(null);
        setShop(null);
        setCurrentBranchId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, shop, loading, currentBranchId, setCurrentBranchId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
