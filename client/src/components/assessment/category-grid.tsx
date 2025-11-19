interface CategoryGridProps {}

export function CategoryGrid({}: CategoryGridProps) {
  const categories = [
    {
      title: "General",
      description: "A summary of the meeting",
    },
    {
      title: "Care Assessment", 
      description: "Organized by Care Act Assessment section",
    },
    {
      title: "Supervision",
      description: "Organized by case",
    },
    {
      title: "Care Review",
      description: "Organized by Care Review from section",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {categories.map((category) => (
        <div
          key={category.title}
          className="bg-card rounded-lg p-4 border border-border shadow-sm"
          data-testid={`card-category-${category.title.toLowerCase().replace(' ', '-')}`}
        >
          <h3 className="font-semibold text-foreground mb-2">{category.title}</h3>
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </div>
      ))}
    </div>
  );
}
