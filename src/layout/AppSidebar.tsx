// src/components/layout/AppSidebar.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
  DollarLineIcon,
  DownloadIcon,
  // Otros íconos si los necesitas
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { usePermissions } from "../hooks/usePermissions";

// Define el tipo para los subitems
type SubItem = {
  name: string;
  path: string;
  pro?: boolean; // Si tienes planes pro
  new?: boolean; // Para marcar elementos nuevos
  permission?: string; // Permiso requerido para acceder a este subitem
};

// Define el tipo para los ítems de navegación principales
type NavItem = {
  id: string; // ID único para cada item
  name: string;
  icon: React.ReactNode;
  path?: string; // Opcional si es un menú principal con subItems
  subItems?: SubItem[]; // Añadido para los submenús
  permission?: string; // Permiso requerido para acceder a este módulo
};

const navItems: NavItem[] = [
  {
    id: "dashboard",
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
    permission: "dashboard", // Permiso específico para dashboard
  },
  {
    id: "compras",
    icon: <DownloadIcon />, // Icono para el menú principal de Compras
    name: "Compras",
    permission: "compras", // Permiso específico para el módulo de compras
    subItems: [
      { name: "Listado de Compras", path: "/compras", permission: "compras" },
      { name: "Proveedores", path: "/proveedores", permission: "proveedores" },
      { name: "Productos", path: "/productos", permission: "productos" },
    ],
  },
  {
    id: "ventas",
    icon: <DollarLineIcon />, // Icono para el menú principal de Ventas
    name: "Ventas",
    permission: "ventas", // Permiso específico para el módulo de ventas
    subItems: [
      { name: "Listado de Ventas", path: "/ventas", permission: "ventas" },
      { name: "Clientes", path: "/clientes", permission: "clientes" },
      { name: "Devoluciones", path: "/devoluciones", permission: "devoluciones" },
    ],
  },
  {
    id: "administracion",
    icon: <UserCircleIcon />, // Un icono para el menú de Administración/Acceso
    name: "Administración",
    permission: "usuarios", // Permiso principal para el módulo de administración
    subItems: [
      { name: "Roles", path: "/roles", permission: "roles" },
    ],
  },
  // Si tienes otras secciones que no necesitan submenú, las mantienes aquí
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { hasPermission, user } = usePermissions();

  // Función para filtrar elementos de navegación según permisos
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // Si no tiene permiso definido, siempre se muestra (como Dashboard)
      if (!item.permission) return true;
      
      // Si no hay usuario o permisos, mostrar solo Dashboard
      if (!user || !user.permisos || user.permisos.length === 0) {
        return item.id === 'dashboard';
      }
      
      // Si tiene permiso definido, verificar si el usuario lo tiene
      if (!hasPermission(item.permission)) {
        return false;
      }
      
      // Si tiene subItems, filtrar también los subItems
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => {
          if (!subItem.permission) return true;
          return hasPermission(subItem.permission);
        });
        
        // Actualizar los subItems filtrados (incluso si está vacío)
        item.subItems = filteredSubItems;
        
        // Permitir mostrar la sección principal aunque no tenga subItems visibles
        // Esto permite que el usuario pueda desplegar la sección
      }
      
      return true;
    });
  };

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    id: string;
  } | null>(null);

  // Obtener elementos de navegación filtrados
  const filteredNavItems = filterNavItems(navItems);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Efecto para forzar re-render cuando cambien los permisos del usuario
  useEffect(() => {
    console.log('AppSidebar: Permisos del usuario actualizados:', user?.permisos);
  }, [user?.permisos]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // useEffect comentado para evitar conflictos con el clic manual
  // useEffect(() => {
  //   filteredNavItems.forEach((nav) => {
  //     if (nav.subItems) {
  //       nav.subItems.forEach((subItem) => {
  //         if (isActive(subItem.path)) {
  //           setOpenSubmenu({ type: "main", id: nav.id });
  //         }
  //       });
  //     } else if (nav.path && isActive(nav.path)) {
  //       setOpenSubmenu(null);
  //     }
  //   });
  // }, [location, isActive, filteredNavItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.id}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  useEffect(() => {
    if (openSubmenu !== null && (isExpanded || isHovered || isMobileOpen)) {
      const key = `${openSubmenu.type}-${openSubmenu.id}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [isExpanded, isHovered, isMobileOpen, openSubmenu]);


  const handleSubmenuToggle = (id: string) => {
    setOpenSubmenu((prev) => {
      const newState = prev?.id === id ? null : { type: "main" as const, id };
      return newState;
    });
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.id}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(nav.id)}
              className={`menu-item group ${
                openSubmenu?.id === nav.id ? "menu-item-active" : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  openSubmenu?.id === nav.id ? "menu-item-icon-active" : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.id === nav.id ? "rotate-180 text-brand-500" : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`main-${nav.id}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.id === nav.id
                    ? `${subMenuHeight[`main-${nav.id}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.length > 0 ? (
                  nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.name}
                        {subItem.new && (
                          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500 text-white">Nuevo</span>
                        )}
                        {subItem.pro && (
                          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500 text-white">Pro</span>
                        )}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-gray-500 italic">
                    No tienes permisos para acceder a ningún módulo de esta sección
                  </li>
                )}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-400
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.png"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(filteredNavItems)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;