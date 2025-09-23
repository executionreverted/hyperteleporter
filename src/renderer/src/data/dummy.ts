import { TreeNode } from "../../../components/ui/tree-view";

export const dummyData: TreeNode[] = [
  {
    id: "1",
    name: "Projects",
    type: "folder",
    size: "2.3 GB",
    modified: "2 days ago",
    children: [
      {
        id: "1-1",
        name: "Web Development",
        type: "folder",
        size: "1.8 GB",
        modified: "1 day ago",
        children: [
          {
            id: "1-1-1",
            name: "E-commerce Platform",
            type: "folder",
            size: "950 MB",
            modified: "3 hours ago",
            children: [
              {
                id: "1-1-1-1",
                name: "Frontend",
                type: "folder",
                size: "420 MB",
                modified: "2 hours ago",
                children: [
                  {
                    id: "1-1-1-1-1",
                    name: "src",
                    type: "folder",
                    size: "380 MB",
                    modified: "1 hour ago",
                    children: [
                      {
                        id: "1-1-1-1-1-1",
                        name: "components",
                        type: "folder",
                        size: "120 MB",
                        modified: "30 minutes ago",
                        children: [
                          {
                            id: "1-1-1-1-1-1-1",
                            name: "ProductCard.tsx",
                            type: "file",
                            size: "8.2 KB",
                            modified: "15 minutes ago"
                          },
                          {
                            id: "1-1-1-1-1-1-2",
                            name: "ShoppingCart.tsx",
                            type: "file",
                            size: "12.5 KB",
                            modified: "1 hour ago"
                          },
                          {
                            id: "1-1-1-1-1-1-3",
                            name: "UserProfile.tsx",
                            type: "file",
                            size: "15.3 KB",
                            modified: "2 hours ago"
                          }
                        ]
                      },
                      {
                        id: "1-1-1-1-1-2",
                        name: "pages",
                        type: "folder",
                        size: "95 MB",
                        modified: "45 minutes ago",
                        children: [
                          {
                            id: "1-1-1-1-1-2-1",
                            name: "HomePage.tsx",
                            type: "file",
                            size: "6.8 KB",
                            modified: "1 hour ago"
                          },
                          {
                            id: "1-1-1-1-1-2-2",
                            name: "ProductPage.tsx",
                            type: "file",
                            size: "9.2 KB",
                            modified: "30 minutes ago"
                          }
                        ]
                      },
                      {
                        id: "1-1-1-1-1-3",
                        name: "utils",
                        type: "folder",
                        size: "45 MB",
                        modified: "1 day ago",
                        children: [
                          {
                            id: "1-1-1-1-1-3-1",
                            name: "api.ts",
                            type: "file",
                            size: "3.2 KB",
                            modified: "2 days ago"
                          },
                          {
                            id: "1-1-1-1-1-3-2",
                            name: "helpers.ts",
                            type: "file",
                            size: "2.8 KB",
                            modified: "3 days ago"
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: "1-1-1-1-2",
                    name: "public",
                    type: "folder",
                    size: "25 MB",
                    modified: "1 week ago",
                    children: [
                      {
                        id: "1-1-1-1-2-1",
                        name: "images",
                        type: "folder",
                        size: "20 MB",
                        modified: "5 days ago",
                        children: [
                          {
                            id: "1-1-1-1-2-1-1",
                            name: "logo.png",
                            type: "file",
                            size: "2.1 MB",
                            modified: "1 week ago"
                          },
                          {
                            id: "1-1-1-1-2-1-2",
                            name: "hero-banner.jpg",
                            type: "file",
                            size: "8.5 MB",
                            modified: "3 days ago"
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                id: "1-1-1-2",
                name: "Backend",
                type: "folder",
                size: "480 MB",
                modified: "4 hours ago",
                children: [
                  {
                    id: "1-1-1-2-1",
                    name: "api",
                    type: "folder",
                    size: "200 MB",
                    modified: "2 hours ago",
                    children: [
                      {
                        id: "1-1-1-2-1-1",
                        name: "controllers",
                        type: "folder",
                        size: "85 MB",
                        modified: "1 hour ago",
                        children: [
                          {
                            id: "1-1-1-2-1-1-1",
                            name: "ProductController.js",
                            type: "file",
                            size: "12.3 KB",
                            modified: "30 minutes ago"
                          },
                          {
                            id: "1-1-1-2-1-1-2",
                            name: "UserController.js",
                            type: "file",
                            size: "15.7 KB",
                            modified: "1 hour ago"
                          }
                        ]
                      },
                      {
                        id: "1-1-1-2-1-2",
                        name: "models",
                        type: "folder",
                        size: "65 MB",
                        modified: "2 hours ago",
                        children: [
                          {
                            id: "1-1-1-2-1-2-1",
                            name: "Product.js",
                            type: "file",
                            size: "8.9 KB",
                            modified: "1 day ago"
                          },
                          {
                            id: "1-1-1-2-1-2-2",
                            name: "User.js",
                            type: "file",
                            size: "6.2 KB",
                            modified: "2 days ago"
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: "1-1-1-2-2",
                    name: "database",
                    type: "folder",
                    size: "180 MB",
                    modified: "3 hours ago",
                    children: [
                      {
                        id: "1-1-1-2-2-1",
                        name: "migrations",
                        type: "folder",
                        size: "45 MB",
                        modified: "1 day ago",
                        children: [
                          {
                            id: "1-1-1-2-2-1-1",
                            name: "001_create_users.sql",
                            type: "file",
                            size: "2.1 KB",
                            modified: "1 week ago"
                          },
                          {
                            id: "1-1-1-2-2-1-2",
                            name: "002_create_products.sql",
                            type: "file",
                            size: "3.8 KB",
                            modified: "5 days ago"
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "1-1-2",
            name: "Portfolio Website",
            type: "folder",
            size: "650 MB",
            modified: "1 week ago",
            children: [
              {
                id: "1-1-2-1",
                name: "design",
                type: "folder",
                size: "200 MB",
                modified: "3 days ago",
                children: [
                  {
                    id: "1-1-2-1-1",
                    name: "wireframes",
                    type: "folder",
                    size: "85 MB",
                    modified: "1 week ago",
                    children: [
                      {
                        id: "1-1-2-1-1-1",
                        name: "homepage.fig",
                        type: "file",
                        size: "12.5 MB",
                        modified: "1 week ago"
                      },
                      {
                        id: "1-1-2-1-1-2",
                        name: "about-page.fig",
                        type: "file",
                        size: "8.2 MB",
                        modified: "5 days ago"
                      }
                    ]
                  },
                  {
                    id: "1-1-2-1-2",
                    name: "assets",
                    type: "folder",
                    size: "95 MB",
                    modified: "2 days ago",
                    children: [
                      {
                        id: "1-1-2-1-2-1",
                        name: "icons",
                        type: "folder",
                        size: "25 MB",
                        modified: "1 day ago",
                        children: [
                          {
                            id: "1-1-2-1-2-1-1",
                            name: "social-icons.svg",
                            type: "file",
                            size: "3.2 KB",
                            modified: "2 days ago"
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "1-2",
        name: "Mobile Apps",
        type: "folder",
        size: "450 MB",
        modified: "2 days ago",
        children: [
          {
            id: "1-2-1",
            name: "React Native App",
            type: "folder",
            size: "280 MB",
            modified: "1 day ago",
            children: [
              {
                id: "1-2-1-1",
                name: "src",
                type: "folder",
                size: "150 MB",
                modified: "12 hours ago",
                children: [
                  {
                    id: "1-2-1-1-1",
                    name: "screens",
                    type: "folder",
                    size: "80 MB",
                    modified: "6 hours ago",
                    children: [
                      {
                        id: "1-2-1-1-1-1",
                        name: "HomeScreen.js",
                        type: "file",
                        size: "5.2 KB",
                        modified: "2 hours ago"
                      },
                      {
                        id: "1-2-1-1-1-2",
                        name: "ProfileScreen.js",
                        type: "file",
                        size: "7.8 KB",
                        modified: "4 hours ago"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "2",
    name: "Personal",
    type: "folder",
    size: "1.2 GB",
    modified: "1 week ago",
    children: [
      {
        id: "2-1",
        name: "Photos",
        type: "folder",
        size: "800 MB",
        modified: "3 days ago",
        children: [
          {
            id: "2-1-1",
            name: "2024",
            type: "folder",
            size: "400 MB",
            modified: "2 days ago",
            children: [
              {
                id: "2-1-1-1",
                name: "January",
                type: "folder",
                size: "120 MB",
                modified: "1 month ago",
                children: [
                  {
                    id: "2-1-1-1-1",
                    name: "vacation",
                    type: "folder",
                    size: "85 MB",
                    modified: "1 month ago",
                    children: [
                      {
                        id: "2-1-1-1-1-1",
                        name: "beach-sunset.jpg",
                        type: "file",
                        size: "8.5 MB",
                        modified: "1 month ago"
                      },
                      {
                        id: "2-1-1-1-1-2",
                        name: "mountain-view.jpg",
                        type: "file",
                        size: "12.2 MB",
                        modified: "1 month ago"
                      }
                    ]
                  }
                ]
              },
              {
                id: "2-1-1-2",
                name: "February",
                type: "folder",
                size: "95 MB",
                modified: "3 weeks ago",
                children: [
                  {
                    id: "2-1-1-2-1",
                    name: "birthday-party",
                    type: "folder",
                    size: "60 MB",
                    modified: "3 weeks ago",
                    children: [
                      {
                        id: "2-1-1-2-1-1",
                        name: "cake-cutting.jpg",
                        type: "file",
                        size: "6.8 MB",
                        modified: "3 weeks ago"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "2-2",
        name: "Documents",
        type: "folder",
        size: "250 MB",
        modified: "5 days ago",
        children: [
          {
            id: "2-2-1",
            name: "Taxes",
            type: "folder",
            size: "120 MB",
            modified: "1 week ago",
            children: [
              {
                id: "2-2-1-1",
                name: "2023",
                type: "folder",
                size: "80 MB",
                modified: "2 weeks ago",
                children: [
                  {
                    id: "2-2-1-1-1",
                    name: "W2-forms.pdf",
                    type: "file",
                    size: "2.1 MB",
                    modified: "2 weeks ago"
                  },
                  {
                    id: "2-2-1-1-2",
                    name: "receipts",
                    type: "folder",
                    size: "45 MB",
                    modified: "1 week ago",
                    children: [
                      {
                        id: "2-2-1-1-2-1",
                        name: "business-expenses.pdf",
                        type: "file",
                        size: "8.5 MB",
                        modified: "1 week ago"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "3",
    name: "Work",
    type: "folder",
    size: "3.1 GB",
    modified: "1 day ago",
    children: [
      {
        id: "3-1",
        name: "Client Projects",
        type: "folder",
        size: "2.2 GB",
        modified: "1 day ago",
        children: [
          {
            id: "3-1-1",
            name: "Acme Corp",
            type: "folder",
            size: "1.1 GB",
            modified: "2 days ago",
            children: [
              {
                id: "3-1-1-1",
                name: "Website Redesign",
                type: "folder",
                size: "650 MB",
                modified: "1 day ago",
                children: [
                  {
                    id: "3-1-1-1-1",
                    name: "design-files",
                    type: "folder",
                    size: "400 MB",
                    modified: "1 day ago",
                    children: [
                      {
                        id: "3-1-1-1-1-1",
                        name: "mockups",
                        type: "folder",
                        size: "200 MB",
                        modified: "2 days ago",
                        children: [
                          {
                            id: "3-1-1-1-1-1-1",
                            name: "homepage-v1.psd",
                            type: "file",
                            size: "45.2 MB",
                            modified: "3 days ago"
                          },
                          {
                            id: "3-1-1-1-1-1-2",
                            name: "homepage-v2.psd",
                            type: "file",
                            size: "52.8 MB",
                            modified: "2 days ago"
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "4",
    name: "Archive",
    type: "folder",
    size: "5.8 GB",
    modified: "2 weeks ago",
    children: [
      {
        id: "4-1",
        name: "Old Projects",
        type: "folder",
        size: "3.2 GB",
        modified: "1 month ago",
        children: [
          {
            id: "4-1-1",
            name: "2019-2020",
            type: "folder",
            size: "1.8 GB",
            modified: "2 months ago",
            children: [
              {
                id: "4-1-1-1",
                name: "First Website",
                type: "folder",
                size: "450 MB",
                modified: "3 months ago",
                children: [
                  {
                    id: "4-1-1-1-1",
                    name: "index.html",
                    type: "file",
                    size: "2.1 KB",
                    modified: "3 months ago"
                  },
                  {
                    id: "4-1-1-1-2",
                    name: "style.css",
                    type: "file",
                    size: "5.8 KB",
                    modified: "3 months ago"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "5",
    name: "config.json",
    type: "file",
    size: "1.2 KB",
    modified: "2 hours ago"
  },
  {
    id: "6",
    name: "README.md",
    type: "file",
    size: "3.5 KB",
    modified: "1 day ago"
  },
  {
    id: "7",
    name: "package-lock.json",
    type: "file",
    size: "245.8 KB",
    modified: "3 days ago"
  }
];
